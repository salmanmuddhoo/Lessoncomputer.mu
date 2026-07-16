import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { claimMipsPayment, toMipsOrderId, type MipsEnvironment } from '@/lib/mips'
import { getBillingSettings, getMonthDateRange } from '@/lib/subscription-billing'
import crypto from 'crypto'

// Allow up to 5 minutes — the loop charges cards sequentially via MIPS.
export const maxDuration = 300
export const dynamic = 'force-dynamic'

// Deterministic, idempotent order id for a given student + package + billing period.
// Re-deriving the same id means a duplicate/overlapping cron run tries to INSERT the
// same primary key, hits a unique violation, and is skipped instead of charging twice.
function periodOrderId(studentId: string, packageId: string, year: number, month: number): string {
  const h = crypto.createHash('sha256').update(`${studentId}:${packageId}:${year}-${month}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}

// GET /api/cron/billing
// The Vercel cron runs once daily (Hobby plan); this route bills on the configured
// billing day (Mauritius time) AND on any later day of the month for students not yet
// billed, so a single failed/missed run no longer skips the whole month. Charging is
// idempotent per student+package+month (see periodOrderId), so re-runs never double-charge.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Use service-role for all DB operations — no user session in cron context
  const admin = createServiceRoleClient()

  // Bill on the configured day, in Mauritius time (UTC+4, no DST). The Vercel cron
  // runs once daily (Hobby plan); this gate decides the day.
  const { billingDay } = await getBillingSettings(admin)
  const mu = new Date(Date.now() + 4 * 60 * 60 * 1000) // shift so UTC getters read Mauritius wall-clock
  const today = mu.getUTCDate()
  // Last day of the (Mauritius) month — so a billing_day of 29/30/31 still fires in
  // shorter months (e.g. billing_day 31 charges on 28 Feb).
  const daysInMonth = new Date(Date.UTC(mu.getUTCFullYear(), mu.getUTCMonth() + 1, 0)).getUTCDate()
  const effectiveBillingDay = Math.min(billingDay, daysInMonth)
  // Run on the billing day OR any later day of the month (self-healing: a missed/failed
  // run on the exact day is picked up on subsequent days). Idempotency prevents re-charging
  // students who were already billed this cycle.
  if (today < effectiveBillingDay) {
    return NextResponse.json({ ok: true, skipped: true, reason: `Mauritius day ${today}; billing from day ${billingDay} (eff ${effectiveBillingDay})` })
  }

  // Determine next month — the period students are paying for today
  const nextMonthDate = new Date(Date.UTC(mu.getUTCFullYear(), mu.getUTCMonth() + 1, 1))
  const nextMonth = nextMonthDate.getUTCMonth() + 1   // 1–12
  const nextYear  = nextMonthDate.getUTCFullYear()
  const { validFrom, validUntil } = getMonthDateRange(nextMonth, nextYear)

  const { data: settings } = await (admin as any)
    .from('site_settings')
    .select('mips_environment')
    .eq('id', 1)
    .single()
  const env: MipsEnvironment = (settings?.mips_environment as MipsEnvironment) ?? 'test'

  // Fetch all active tokens. NOTE: student_payment_tokens.student_id → auth.users,
  // so we do NOT embed profiles here (that cross-table embed can fail); grade/price
  // are resolved with a separate lookup below.
  const { data: tokensRaw, error: tokensError } = await (admin as any)
    .from('student_payment_tokens')
    .select('id, student_id, id_token, max_amount, currency')
    .eq('is_active', true)

  if (tokensError) console.error('[cron/billing] token fetch error:', tokensError)

  const tokens = (tokensRaw ?? []) as Array<{
    id: string
    student_id: string
    id_token: string
    max_amount: number
    currency: string
  }>

  // Resolve each student's grade + monthly live price in one lookup.
  const tokenStudentIds = [...new Set(tokens.map((t) => t.student_id))]
  const gradeByStudent = new Map<string, { gradeId: string | null; gradePrice: number }>()
  if (tokenStudentIds.length > 0) {
    const { data: profs } = await (admin as any)
      .from('profiles')
      .select('id, grade_id, grade:grades(live_subscription_price)')
      .in('id', tokenStudentIds)
    for (const p of (profs ?? []) as any[]) {
      gradeByStudent.set(p.id, { gradeId: p.grade_id ?? null, gradePrice: Number(p.grade?.live_subscription_price ?? 0) })
    }
  }

  const results: Array<{ studentId: string; status: string; reason?: string }> = []

  for (const token of tokens) {
    const studentInfo = gradeByStudent.get(token.student_id)
    const gradeId = studentInfo?.gradeId
    if (!gradeId) {
      results.push({ studentId: token.student_id, status: 'skipped', reason: 'no grade' })
      continue
    }

    // If the student soft-cancelled (is_recurring=false) and billing day arrived
    // without them restoring, their intent is clear — deactivate the ODRP token
    // so we never attempt to charge a card they've effectively abandoned.
    const { data: recurringLiveSub } = await (admin as any)
      .from('student_subscriptions')
      .select('id')
      .eq('student_id', token.student_id)
      .eq('subscription_type', 'live')
      .eq('is_recurring', true)
      .eq('status', 'active')
      .maybeSingle()

    if (!recurringLiveSub) {
      await (admin as any)
        .from('student_payment_tokens')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', token.id)
      results.push({ studentId: token.student_id, status: 'skipped', reason: 'recurring cancelled — token deactivated' })
      continue
    }

    const { data: nextPkg } = await (admin as any)
      .from('subscription_packages')
      .select('id, name, price')
      .eq('grade_id', gradeId)
      .eq('package_type', 'live_month')
      .eq('is_active', true)
      .eq('month', nextMonth)
      .eq('year', nextYear)
      .single()

    if (!nextPkg) {
      results.push({ studentId: token.student_id, status: 'skipped', reason: 'no next-month package' })
      continue
    }

    // Skip if already subscribed to next month's package
    const { data: existingSub } = await (admin as any)
      .from('student_subscriptions')
      .select('id')
      .eq('student_id', token.student_id)
      .eq('package_id', nextPkg.id)
      .eq('status', 'active')
      .maybeSingle()

    if (existingSub) {
      results.push({ studentId: token.student_id, status: 'skipped', reason: 'already subscribed' })
      continue
    }

    // The live-month package's `price` column is 0 — the real monthly price lives on
    // the grade. Charge the grade's live_subscription_price, capped at what the student
    // authorised (token.max_amount); fall back to the token cap if the grade price is unset.
    const gradePrice = Number(studentInfo?.gradePrice ?? 0)
    const tokenMax = Number(token.max_amount ?? 0)
    const amount = gradePrice > 0 ? Math.min(gradePrice, tokenMax || gradePrice) : tokenMax

    if (!amount || amount <= 0) {
      results.push({ studentId: token.student_id, status: 'skipped', reason: `no recurring price (grade ${gradePrice}, token max ${tokenMax})` })
      continue
    }

    // Idempotent per student+package+month: a duplicate/overlapping run derives the
    // same id and the INSERT fails with a unique violation, so we skip instead of
    // charging the card a second time.
    const claimOrderId = periodOrderId(token.student_id, nextPkg.id, nextYear, nextMonth)
    const { error: orderError } = await (admin as any)
      .from('mips_orders')
      .insert({
        id:           claimOrderId,
        student_id:   token.student_id,
        order_type:   'live',
        package_ids:  [nextPkg.id],
        is_recurring: true,
        amount,
        currency:     token.currency,
        description:  `Live classes: ${nextPkg.name} (auto-renewal)`,
        status:       'pending',
        metadata:     { env, claim: true, cron: true },
      })

    if (orderError) {
      // 23505 = unique_violation → this student+package+month was already processed
      // by an earlier/overlapping run. Skip to avoid a double charge.
      if ((orderError as any).code === '23505') {
        results.push({ studentId: token.student_id, status: 'skipped', reason: 'already processed this period' })
      } else {
        results.push({ studentId: token.student_id, status: 'error', reason: orderError.message })
      }
      continue
    }

    try {
      const claimResult = await claimMipsPayment({
        env,
        orderId: claimOrderId,
        amount,
        currency: token.currency,
        idToken: token.id_token,
      })

      if (claimResult.status === 'SUCCESS') {
        await (admin as any)
          .from('student_subscriptions')
          .upsert({
            student_id:        token.student_id,
            package_id:        nextPkg.id,
            subscription_type: 'live',
            is_recurring:      true,
            status:            'active',
            valid_from:        validFrom,
            valid_until:       validUntil,
          }, { onConflict: 'student_id,package_id' })

        // Previous months are no longer the active recurring one — clear is_recurring on
        // every other recurring row (only live subs are ever recurring, so no need to
        // filter by subscription_type, which may be inconsistent on older rows).
        await (admin as any)
          .from('student_subscriptions')
          .update({ is_recurring: false, updated_at: new Date().toISOString() })
          .eq('student_id', token.student_id)
          .eq('is_recurring', true)
          .neq('package_id', nextPkg.id)

        await (admin as any)
          .from('mips_orders')
          .update({ status: 'paid', updated_at: new Date().toISOString() })
          .eq('id', claimOrderId)

        results.push({ studentId: token.student_id, status: 'SUCCESS' })
      } else {
        // Record the failure with its reason so admin & student can see why.
        await (admin as any)
          .from('mips_orders')
          .update({ status: 'failed', metadata: { env, claim: true, cron: true, failureReason: claimResult.reason }, updated_at: new Date().toISOString() })
          .eq('id', claimOrderId)

        if (['DECLINED', 'BLOCKED'].includes(claimResult.reason)) {
          await (admin as any)
            .from('student_payment_tokens')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', token.id)
        }

        results.push({ studentId: token.student_id, status: claimResult.status, reason: claimResult.reason })
      }
    } catch (err) {
      await (admin as any)
        .from('mips_orders')
        .update({ status: 'failed', metadata: { env, claim: true, cron: true, failureReason: String(err) }, updated_at: new Date().toISOString() })
        .eq('id', claimOrderId)
      results.push({ studentId: token.student_id, status: 'error', reason: String(err) })
    }
  }

  const success = results.filter(r => r.status === 'SUCCESS').length
  const failed  = results.filter(r => !['SUCCESS', 'skipped'].includes(r.status)).length
  const summary = {
    processed: results.length,
    success,
    skipped:   results.filter(r => r.status === 'skipped').length,
    failed,
    activeTokens: tokens.length,
    tokensError: tokensError ? String(tokensError.message ?? tokensError) : null,
    billingDay,
    nextMonth,
    nextYear,
    validFrom,
    validUntil,
  }

  console.log('[cron/billing]', summary, results)

  // Surface systemic failures as a non-2xx status so Vercel Cron alerting fires.
  // A total wipe-out (couldn't even read tokens, or every charge attempt failed) is a
  // real incident; isolated declines among successes are normal and stay 200.
  const attempted = success + failed
  const hardFailure = Boolean(tokensError) || (attempted > 0 && success === 0)
  if (hardFailure) {
    return NextResponse.json({ ok: false, ...summary, results }, { status: 500 })
  }
  return NextResponse.json({ ok: true, ...summary, results })
}

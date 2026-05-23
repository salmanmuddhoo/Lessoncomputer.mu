import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { claimMipsPayment, toMipsOrderId, type MipsEnvironment } from '@/lib/mips'
import crypto from 'crypto'

// GET /api/cron/billing
// Runs on the 29th of each month via Vercel Cron.
// For every student with an active ODRP token, claims payment for the NEXT
// month's live package so access is granted before the new month begins.
export async function GET(req: NextRequest) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()

  // Determine next month
  const now = new Date()
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const nextMonth = nextMonthDate.getMonth() + 1   // 1–12
  const nextYear  = nextMonthDate.getFullYear()

  const { data: settings } = await (supabase as any)
    .from('site_settings')
    .select('mips_environment')
    .eq('id', 1)
    .single()
  const env: MipsEnvironment = (settings?.mips_environment as MipsEnvironment) ?? 'test'

  // Fetch all active tokens with student grade info
  const { data: tokensRaw } = await (supabase as any)
    .from('student_payment_tokens')
    .select('id, student_id, id_token, max_amount, currency, profiles(grade_id)')
    .eq('is_active', true)

  const tokens = (tokensRaw ?? []) as Array<{
    id: string
    student_id: string
    id_token: string
    max_amount: number
    currency: string
    profiles: { grade_id: string | null } | null
  }>

  const results: Array<{ studentId: string; status: string; reason?: string }> = []

  for (const token of tokens) {
    const gradeId = token.profiles?.grade_id
    if (!gradeId) {
      results.push({ studentId: token.student_id, status: 'skipped', reason: 'no grade' })
      continue
    }

    // Find next month's live package for this student's grade
    const { data: nextPkg } = await (supabase as any)
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

    // Skip if already subscribed to next month
    const { data: existingSub } = await (supabase as any)
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

    const amount = Number(nextPkg.price)
    if (amount > token.max_amount) {
      results.push({ studentId: token.student_id, status: 'skipped', reason: `amount ${amount} > token max ${token.max_amount}` })
      continue
    }

    // Create an order record for this claim
    const claimOrderId = crypto.randomUUID()
    const { data: order, error: orderError } = await (supabase as any)
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
      .select('id')
      .single()

    if (orderError) {
      results.push({ studentId: token.student_id, status: 'error', reason: orderError.message })
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
        // Activate next month's subscription
        await (supabase as any)
          .from('student_subscriptions')
          .upsert({
            student_id:        token.student_id,
            package_id:        nextPkg.id,
            subscription_type: 'live',
            is_recurring:      true,
            status:            'active',
          }, { onConflict: 'student_id,package_id' })

        await (supabase as any)
          .from('mips_orders')
          .update({ status: 'paid', updated_at: new Date().toISOString() })
          .eq('id', claimOrderId)

        results.push({ studentId: token.student_id, status: 'SUCCESS' })
      } else {
        await (supabase as any)
          .from('mips_orders')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', claimOrderId)

        // Permanently failed — deactivate token
        if (['DECLINED', 'BLOCKED'].includes(claimResult.reason)) {
          await (supabase as any)
            .from('student_payment_tokens')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', token.id)
        }

        results.push({ studentId: token.student_id, status: claimResult.status, reason: claimResult.reason })
      }
    } catch (err) {
      await (supabase as any)
        .from('mips_orders')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', claimOrderId)
      results.push({ studentId: token.student_id, status: 'error', reason: String(err) })
    }
  }

  const summary = {
    processed: results.length,
    success:   results.filter(r => r.status === 'SUCCESS').length,
    skipped:   results.filter(r => r.status === 'skipped').length,
    failed:    results.filter(r => !['SUCCESS', 'skipped'].includes(r.status)).length,
  }

  console.log('[cron/billing]', summary, results)
  return NextResponse.json({ ok: true, ...summary, results })
}

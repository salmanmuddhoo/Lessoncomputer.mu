import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { claimMipsPayment, type MipsEnvironment } from '@/lib/mips'
import { getMonthDateRange } from '@/lib/subscription-billing'
import crypto from 'crypto'

// POST /api/payment/retry-recurring
// Lets a student manually re-attempt a recurring live charge that previously failed
// (e.g. insufficient funds at the time). Runs the same claim-via-MIPS flow the billing
// cron uses, against the student's stored ODRP token. Body: { orderId } — the failed order.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { orderId } = await req.json() as { orderId: string }
    if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })

    const admin = createServiceRoleClient()

    // Load the failed order and verify it belongs to the caller.
    const { data: order } = await (admin as any)
      .from('mips_orders')
      .select('id, student_id, package_ids, currency, status, is_recurring, metadata')
      .eq('id', orderId)
      .single()

    if (!order || order.student_id !== user.id) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (order.status === 'paid') return NextResponse.json({ ok: true }) // nothing to retry

    // Identify the recurring live_month package this order was for.
    const { data: pkgs } = await (admin as any)
      .from('subscription_packages')
      .select('id, month, year, grade_id, package_type')
      .in('id', order.package_ids ?? [])
    const livePkg = (pkgs ?? []).find((p: any) => p.package_type === 'live_month')
    if (!livePkg) {
      return NextResponse.json({ error: 'This order is not a recurring live subscription.' }, { status: 400 })
    }

    const { validFrom, validUntil } = getMonthDateRange(livePkg.month, livePkg.year)
    const muToday = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().split('T')[0] // Mauritius (UTC+4)
    if (validUntil && validUntil < muToday) {
      return NextResponse.json(
        { error: 'This billing period has already passed. Please subscribe again from your grade page.' },
        { status: 400 }
      )
    }

    // Idempotency: if the subscription is already active, don't charge again.
    const { data: existingSub } = await (admin as any)
      .from('student_subscriptions')
      .select('id')
      .eq('student_id', user.id)
      .eq('package_id', livePkg.id)
      .eq('status', 'active')
      .maybeSingle()
    if (existingSub) {
      await (admin as any)
        .from('mips_orders')
        .update({ metadata: { ...(order.metadata ?? {}), resolved: true }, updated_at: new Date().toISOString() })
        .eq('id', order.id)
      return NextResponse.json({ ok: true, alreadyActive: true })
    }

    // Stored ODRP token (admin-only under RLS). Reactivate it — a failed charge may
    // have deactivated it — so the claim can go through.
    const { data: token } = await (admin as any)
      .from('student_payment_tokens')
      .select('id, id_token, max_amount, currency')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!token?.id_token) {
      return NextResponse.json(
        { error: 'No payment method on file. Please subscribe again from your grade page.' },
        { status: 400 }
      )
    }

    // Charge the grade's live price, capped at what the student authorised on the token.
    const { data: gradeRow } = await (admin as any)
      .from('grades')
      .select('live_subscription_price')
      .eq('id', livePkg.grade_id)
      .single()
    const gradePrice = Number(gradeRow?.live_subscription_price ?? 0)
    const tokenMax = Number(token.max_amount ?? 0)
    const amount = gradePrice > 0 ? Math.min(gradePrice, tokenMax || gradePrice) : tokenMax
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'No recurring price configured for your grade.' }, { status: 400 })
    }

    await (admin as any)
      .from('student_payment_tokens')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', token.id)

    const { data: settings } = await (admin as any)
      .from('site_settings').select('mips_environment').eq('id', 1).single()
    const env: MipsEnvironment = (settings?.mips_environment as MipsEnvironment) ?? 'test'

    // Fresh id so MIPS doesn't treat the retry as a duplicate of the failed attempt.
    const claimOrderId = crypto.randomUUID()
    const result = await claimMipsPayment({
      env,
      orderId: claimOrderId,
      amount,
      currency: token.currency ?? order.currency ?? 'MUR',
      idToken: token.id_token,
    })

    if (result.status === 'SUCCESS') {
      await (admin as any)
        .from('student_subscriptions')
        .upsert({
          student_id:        user.id,
          package_id:        livePkg.id,
          subscription_type: 'live',
          is_recurring:      true,
          status:            'active',
          valid_from:        validFrom,
          valid_until:       validUntil,
        }, { onConflict: 'student_id,package_id' })

      // Only the latest paid month should drive future recurring billing.
      await (admin as any)
        .from('student_subscriptions')
        .update({ is_recurring: false, updated_at: new Date().toISOString() })
        .eq('student_id', user.id)
        .eq('is_recurring', true)
        .neq('package_id', livePkg.id)

      // Record the successful payment (for receipts) and mark the old failed order resolved.
      await (admin as any)
        .from('mips_orders')
        .insert({
          id:           claimOrderId,
          student_id:   user.id,
          order_type:   'live',
          package_ids:  [livePkg.id],
          is_recurring: true,
          amount,
          currency:     token.currency ?? order.currency ?? 'MUR',
          description:  `Live classes (retry) — ${livePkg.month}/${livePkg.year}`,
          status:       'paid',
          metadata:     { env, claim: true, retry: true },
        })

      await (admin as any)
        .from('mips_orders')
        .update({ metadata: { ...(order.metadata ?? {}), resolved: true, retriedOrderId: claimOrderId }, updated_at: new Date().toISOString() })
        .eq('id', order.id)

      return NextResponse.json({ ok: true })
    }

    // Still failing — record the latest reason so the student sees why.
    await (admin as any)
      .from('mips_orders')
      .update({ metadata: { ...(order.metadata ?? {}), failureReason: result.reason }, updated_at: new Date().toISOString() })
      .eq('id', order.id)

    return NextResponse.json(
      { error: `Payment could not be completed${result.reason ? ` (${result.reason})` : ''}. Please check with your bank and try again.` },
      { status: 400 }
    )
  } catch (err) {
    console.error('[payment/retry-recurring]', err)
    return NextResponse.json({ error: 'Could not retry the payment. Please try again.' }, { status: 500 })
  }
}

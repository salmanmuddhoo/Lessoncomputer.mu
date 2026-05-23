import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { claimMipsPayment, toMipsOrderId, type MipsEnvironment } from '@/lib/mips'

// POST /api/payment/claim
// Called by a cron job each month to charge recurring live subscribers.
// Body: { studentId: string, packageIds: string[], amount: number, description: string }
// Protected by CRON_SECRET header to prevent unauthorised calls.
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json() as {
      studentId: string
      packageIds: string[]
      amount: number
      description: string
    }

    const { studentId, packageIds, amount, description } = body

    if (!studentId || !packageIds?.length || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get active token for this student
    const { data: tokenRaw } = await (supabase as any)
      .from('student_payment_tokens')
      .select('id, id_token, max_amount, currency')
      .eq('student_id', studentId)
      .eq('is_active', true)
      .single()

    if (!tokenRaw) {
      return NextResponse.json({ error: 'No active payment token for student' }, { status: 404 })
    }

    const token = tokenRaw as { id: string; id_token: string; max_amount: number; currency: string }

    if (amount > token.max_amount) {
      return NextResponse.json(
        { error: `Claim amount ${amount} exceeds token max_amount ${token.max_amount}` },
        { status: 400 }
      )
    }

    const { data: settings } = await (supabase as any)
      .from('site_settings')
      .select('mips_environment')
      .eq('id', 1)
      .single()
    const env: MipsEnvironment = (settings?.mips_environment as MipsEnvironment) ?? 'test'

    // Create a new mips_orders record for this claim
    const { data: order, error: orderError } = await (supabase as any)
      .from('mips_orders')
      .insert({
        student_id:   studentId,
        order_type:   'live',
        package_ids:  packageIds,
        is_recurring: true,
        amount,
        currency:     token.currency,
        description,
        status:       'pending',
        metadata:     { env, claim: true },
      })
      .select('id')
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: `Failed to create claim order: ${orderError?.message}` }, { status: 500 })
    }

    const orderId = (order as { id: string }).id
    const result = await claimMipsPayment({
      env,
      orderId,
      amount,
      currency: token.currency,
      idToken: token.id_token,
    })

    if (result.status === 'SUCCESS') {
      // Activate subscriptions immediately (no IMN callback for claims)
      await (supabase as any)
        .from('student_subscriptions')
        .upsert(
          packageIds.map((packageId) => ({
            student_id:        studentId,
            package_id:        packageId,
            subscription_type: 'live',
            is_recurring:      true,
            status:            'active',
          })),
          { onConflict: 'student_id,package_id' }
        )

      await (supabase as any)
        .from('mips_orders')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', orderId)

      console.log('[payment/claim] Success for student:', studentId)
    } else {
      await (supabase as any)
        .from('mips_orders')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', orderId)

      // Deactivate token if MIPS says it's permanently invalid
      if (['DECLINED', 'BLOCKED'].includes(result.reason)) {
        await (supabase as any)
          .from('student_payment_tokens')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', token.id)
      }

      console.error('[payment/claim] Failed for student:', studentId, result)
    }

    return NextResponse.json({ status: result.status, reason: result.reason, orderId })
  } catch (err) {
    console.error('[payment/claim]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

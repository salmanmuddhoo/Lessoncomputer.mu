import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyMipsCallback } from '@/lib/mips'

// MIPS IMN (Instant Merchant Notification) callback
// MIPS POSTs this after payment is processed
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      transactionId?: string
      orderId?: string
      status?: string
      amount?: string | number
      hash?: string
    }

    const orderId = body.transactionId ?? body.orderId
    const status = body.status ?? ''
    const amount = body.amount ?? ''
    const hash = body.hash ?? ''

    if (!orderId) {
      return NextResponse.json({ error: 'Missing transactionId' }, { status: 400 })
    }

    // Verify HMAC signature if hash salt is configured
    const hashSalt = process.env.MIPS_HASH_SALT
    if (hashSalt && hash) {
      const valid = verifyMipsCallback({ transactionId: orderId, amount, status, receivedHash: hash })
      if (!valid) {
        console.error('[payment/callback] Invalid hash for order', orderId)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
      }
    }

    const supabase = await createClient()

    // Look up the order
    const { data: orderRaw } = await (supabase as any)
      .from('mips_orders')
      .select('id, student_id, order_type, package_ids, is_recurring, status')
      .eq('id', orderId)
      .single()

    const order = orderRaw as {
      id: string
      student_id: string
      order_type: string
      package_ids: string[]
      is_recurring: boolean
      status: string
    } | null

    if (!order) {
      console.error('[payment/callback] Order not found:', orderId)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status === 'paid') {
      // Already processed — idempotent response
      return NextResponse.json({ ok: true })
    }

    const isPaid = status.toLowerCase() === 'success' || status.toLowerCase() === 'paid'

    if (isPaid) {
      // Activate subscriptions for all packages
      const subscriptionRows = order.package_ids.map((packageId: string) => ({
        student_id: order.student_id,
        package_id: packageId,
        is_recurring: order.is_recurring,
        status: 'active',
      }))

      const { error: subError } = await (supabase as any)
        .from('student_subscriptions')
        .upsert(subscriptionRows, { onConflict: 'student_id,package_id' })

      if (subError) {
        console.error('[payment/callback] Failed to create subscriptions:', subError)
        return NextResponse.json({ error: 'Subscription activation failed' }, { status: 500 })
      }

      await (supabase as any)
        .from('mips_orders')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', orderId)

      console.log('[payment/callback] Order paid, subscriptions activated:', orderId)
    } else {
      await (supabase as any)
        .from('mips_orders')
        .update({ status: status.toLowerCase() === 'cancel' ? 'cancelled' : 'failed', updated_at: new Date().toISOString() })
        .eq('id', orderId)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[payment/callback]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// Some gateways call GET for IMN
export async function GET(req: NextRequest) {
  return POST(req)
}

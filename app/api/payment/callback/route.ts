import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyMipsCallback } from '@/lib/mips'

// MIPS IMN (Instant Merchant Notification) callback
// MIPS POSTs this to the callback URL configured in the MiPS merchant back office
export async function POST(req: NextRequest) {
  try {
    // MIPS sends the callback as JSON; field names based on MiPS IMN spec
    const body = await req.json() as Record<string, unknown>

    // MIPS identifies the order by id_order (the value we passed in the payment request)
    const mipsOrderId = (body.id_order ?? body.order_id ?? body.transactionId ?? '') as string
    const status      = (body.status ?? body.payment_status ?? '') as string
    const amount      = body.amount ?? body.payment_amount ?? ''
    const hash        = (body.hash ?? body.signature ?? '') as string

    if (!mipsOrderId) {
      console.error('[payment/callback] Missing id_order in body:', body)
      return NextResponse.json({ error: 'Missing id_order' }, { status: 400 })
    }

    // Verify HMAC signature when hash salt is configured
    if (hash) {
      const valid = verifyMipsCallback({ mipsOrderId, amount: String(amount), status, receivedHash: hash })
      if (!valid) {
        console.error('[payment/callback] Invalid hash for order', mipsOrderId)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
      }
    }

    const supabase = await createClient()

    // Look up the order by MIPS id_order stored in mips_transaction_id
    const { data: orderRaw } = await (supabase as any)
      .from('mips_orders')
      .select('id, student_id, order_type, package_ids, is_recurring, status')
      .eq('mips_transaction_id', mipsOrderId)
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
      console.error('[payment/callback] Order not found for mips_transaction_id:', mipsOrderId)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status === 'paid') {
      // Already processed — idempotent
      return NextResponse.json({ ok: true })
    }

    const isPaid = ['success', 'paid', 'approved'].includes(status.toLowerCase())

    if (isPaid) {
      // Activate all packages for this order
      const subscriptionRows = order.package_ids.map((packageId: string) => ({
        student_id:  order.student_id,
        package_id:  packageId,
        is_recurring: order.is_recurring,
        status:      'active',
      }))

      const { error: subError } = await (supabase as any)
        .from('student_subscriptions')
        .upsert(subscriptionRows, { onConflict: 'student_id,package_id' })

      if (subError) {
        console.error('[payment/callback] Subscription activation failed:', subError)
        return NextResponse.json({ error: 'Subscription activation failed' }, { status: 500 })
      }

      await (supabase as any)
        .from('mips_orders')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', order.id)

      console.log('[payment/callback] Order paid, subscriptions activated:', mipsOrderId)
    } else {
      const newStatus = ['cancel', 'cancelled'].includes(status.toLowerCase()) ? 'cancelled' : 'failed'
      await (supabase as any)
        .from('mips_orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', order.id)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[payment/callback]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return POST(req)
}

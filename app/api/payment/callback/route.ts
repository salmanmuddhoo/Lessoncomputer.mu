import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptImnCallback, verifyImnChecksum, type MipsEnvironment } from '@/lib/mips'

// MIPS IMN (Instant Merchant Notification) callback
// MIPS POSTs encrypted data here — we decrypt via the MIPS API then verify checksum
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>

    // MIPS sends the callback as { received_crypted_data: '...' }
    const cryptedData = (body.received_crypted_data ?? body.crypted_data ?? '') as string

    if (!cryptedData) {
      console.error('[payment/callback] Missing received_crypted_data in body:', body)
      return NextResponse.json({ error: 'Missing received_crypted_data' }, { status: 400 })
    }

    const supabase = await createClient()

    // Determine which MIPS environment this order belongs to
    // (read from site_settings; the order metadata also stores it but settings is simpler)
    const { data: settings } = await (supabase as any)
      .from('site_settings')
      .select('mips_environment')
      .eq('id', 1)
      .single()
    const env: MipsEnvironment = (settings?.mips_environment as MipsEnvironment) ?? 'test'

    // Decrypt the callback data via MIPS API
    const decrypted = await decryptImnCallback(cryptedData, env)
    const details = decrypted.transaction_details

    if (!details?.id_order) {
      console.error('[payment/callback] Decrypted data missing id_order:', decrypted)
      return NextResponse.json({ error: 'Invalid decrypted data' }, { status: 400 })
    }

    // Verify checksum: SHA256(amount.currency.status.id_order.transaction_id.type.payment_method.salt)
    const checksumValid = verifyImnChecksum(details)
    if (!checksumValid) {
      console.error('[payment/callback] Checksum mismatch for order:', details.id_order)
      return NextResponse.json({ error: 'Checksum mismatch' }, { status: 403 })
    }

    // Look up the order by MIPS id_order
    const { data: orderRaw } = await (supabase as any)
      .from('mips_orders')
      .select('id, student_id, order_type, package_ids, is_recurring, status')
      .eq('mips_transaction_id', details.id_order)
      .single()

    const order = orderRaw as {
      id: string
      student_id: string
      order_type: 'video' | 'live'
      package_ids: string[]
      is_recurring: boolean
      status: string
    } | null

    if (!order) {
      console.error('[payment/callback] Order not found for id_order:', details.id_order)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status === 'paid') {
      return NextResponse.json({ ok: true }) // idempotent
    }

    if (details.status === 'success') {
      // Activate subscriptions for all packages
      const subscriptionRows = order.package_ids.map((packageId: string) => ({
        student_id:        order.student_id,
        package_id:        packageId,
        subscription_type: order.order_type,   // 'video' | 'live'
        is_recurring:      order.is_recurring,  // false for video, user-chosen for live
        status:            'active',
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
        .update({
          status:     'paid',
          metadata:   { transaction_id: details.transaction_id, payment_method: details.payment_method },
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      // Store MIPS ODRP token for future recurring claims (live subscriptions only)
      if (order.is_recurring && details.id_token) {
        await (supabase as any)
          .from('student_payment_tokens')
          .upsert({
            student_id:           order.student_id,
            id_token:             details.id_token,
            card_last_four_digit: details.card_last_four_digit ?? null,
            max_amount:           Number(details.amount) / 100,
            currency:             details.currency,
            is_active:            true,
            source_order_id:      order.id,
            updated_at:           new Date().toISOString(),
          }, { onConflict: 'student_id' })
        console.log('[payment/callback] ODRP token stored for student:', order.student_id)
      }

      console.log('[payment/callback] Paid & subscriptions activated:', details.id_order)
    } else {
      await (supabase as any)
        .from('mips_orders')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
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

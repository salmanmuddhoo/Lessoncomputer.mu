import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { decryptImnCallback, verifyImnChecksum, type MipsEnvironment } from '@/lib/mips'

// MIPS requires the response body to be the literal string "success" or "fail"
const imn = (s: 'success' | 'fail') =>
  new NextResponse(s, { status: 200, headers: { 'Content-Type': 'text/plain' } })

// MIPS IMN (Instant Merchant Notification) callback
// MIPS POSTs encrypted data here — supports both JSON and form-encoded bodies
export async function POST(req: NextRequest) {
  const rawText = await req.text()
  const contentType = req.headers.get('content-type') ?? ''
  console.error('[payment/callback] received', { contentType, rawText: rawText.slice(0, 300) })

  try {
    // Parse both JSON and application/x-www-form-urlencoded
    let cryptedData = ''
    if (contentType.includes('application/json')) {
      const parsed = JSON.parse(rawText) as Record<string, unknown>
      cryptedData = (parsed.received_crypted_data ?? parsed.crypted_data ?? parsed.crypted_callback ?? '') as string
    } else {
      // form-encoded or unknown — try URLSearchParams first, fallback to JSON
      try {
        const params = new URLSearchParams(rawText)
        cryptedData = params.get('received_crypted_data') ?? params.get('crypted_data') ?? params.get('crypted_callback') ?? ''
      } catch {
        const parsed = JSON.parse(rawText) as Record<string, unknown>
        cryptedData = (parsed.received_crypted_data ?? parsed.crypted_data ?? parsed.crypted_callback ?? '') as string
      }
    }

    if (!cryptedData) {
      console.error('[payment/callback] Missing crypted data. Raw body:', rawText.slice(0, 500))
      return imn('fail')
    }

    const admin = createServiceRoleClient()

    const { data: settings } = await (admin as any)
      .from('site_settings')
      .select('mips_environment')
      .eq('id', 1)
      .single()
    const env: MipsEnvironment = (settings?.mips_environment as MipsEnvironment) ?? 'test'

    const decrypted = await decryptImnCallback(cryptedData, env)
    const details = decrypted.transaction_details

    if (!details?.id_order) {
      console.error('[payment/callback] Decrypted data missing id_order:', decrypted)
      return imn('fail')
    }

    const checksumValid = verifyImnChecksum(details)
    if (!checksumValid) {
      console.error('[payment/callback] Checksum mismatch for order:', details.id_order)
      return imn('fail')
    }

    const { data: orderRaw } = await (admin as any)
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
      return imn('fail')
    }

    if (order.status === 'paid') {
      return imn('success') // idempotent
    }

    if (details.status === 'success') {
      const subscriptionRows = order.package_ids.map((packageId: string) => ({
        student_id:        order.student_id,
        package_id:        packageId,
        subscription_type: order.order_type,
        is_recurring:      order.is_recurring,
        status:            'active',
      }))

      const { error: subError } = await (admin as any)
        .from('student_subscriptions')
        .upsert(subscriptionRows, { onConflict: 'student_id,package_id' })

      if (subError) {
        console.error('[payment/callback] Subscription activation failed:', subError)
        return imn('fail')
      }

      await (admin as any)
        .from('mips_orders')
        .update({
          status:     'paid',
          metadata:   { transaction_id: details.transaction_id, payment_method: details.payment_method },
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      if (order.is_recurring && details.id_token) {
        await (admin as any)
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
      return imn('success')
    } else {
      await (admin as any)
        .from('mips_orders')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', order.id)
      console.error('[payment/callback] Payment failed/rejected:', details.id_order, details)
      return imn('fail')
    }
  } catch (err) {
    console.error('[payment/callback] error:', String(err), 'raw:', rawText.slice(0, 300))
    return imn('fail')
  }
}

export async function GET() {
  // Health check — lets us verify the callback URL is reachable
  return NextResponse.json({ ok: true, endpoint: 'payment/callback' })
}

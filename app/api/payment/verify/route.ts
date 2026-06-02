import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getMipsPaymentDetails, type MipsEnvironment } from '@/lib/mips'

// Fallback for when the IMN callback doesn't fire.
// Called by the payment result page poller — checks MIPS directly and activates if paid.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { orderId } = await req.json() as { orderId: string }
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

  // Use anon client to verify ownership — student can only check their own order
  const { data: orderRaw } = await (supabase as any)
    .from('mips_orders')
    .select('id, student_id, order_type, package_ids, is_recurring, status, mips_transaction_id')
    .eq('id', orderId)
    .eq('student_id', user.id)
    .single()

  if (!orderRaw) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (orderRaw.status === 'paid') return NextResponse.json({ status: 'paid' })

  // No MIPS transaction ID yet means the create_payment_request failed
  if (!orderRaw.mips_transaction_id) {
    return NextResponse.json({ status: orderRaw.status })
  }

  const { data: settings } = await (supabase as any)
    .from('site_settings')
    .select('mips_environment')
    .eq('id', 1)
    .single()
  const env: MipsEnvironment = (settings?.mips_environment as MipsEnvironment) ?? 'test'

  try {
    const details = await getMipsPaymentDetails(orderRaw.mips_transaction_id, env)
    console.log('[payment/verify] MIPS details for order', orderId, JSON.stringify(details).slice(0, 400))

    // MIPS field names vary — handle all known variants
    const paid =
      details.payment_status === 'SUCCESS' ||
      details.payment_status === 'success' ||
      (details as any).status === 'success' ||
      (details as any).status === 'paid'

    if (paid) {
      // Write operations need service-role to bypass RLS on student_subscriptions
      const admin = createServiceRoleClient()

      const subscriptionRows = (orderRaw.package_ids as string[]).map((packageId) => ({
        student_id:        orderRaw.student_id,
        package_id:        packageId,
        subscription_type: orderRaw.order_type,
        is_recurring:      orderRaw.is_recurring,
        status:            'active',
      }))

      const { error: subError } = await (admin as any)
        .from('student_subscriptions')
        .upsert(subscriptionRows, { onConflict: 'student_id,package_id' })

      if (subError) {
        console.error('[payment/verify] subscription upsert failed:', subError)
        return NextResponse.json({ status: orderRaw.status })
      }

      await (admin as any)
        .from('mips_orders')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', orderId)

      console.log('[payment/verify] activated order', orderId, 'for student', orderRaw.student_id)
      return NextResponse.json({ status: 'paid' })
    }

    return NextResponse.json({ status: orderRaw.status })
  } catch (err) {
    // MIPS status check unavailable — fall back to current DB status
    console.error('[payment/verify] MIPS check failed:', String(err))
    return NextResponse.json({ status: orderRaw.status })
  }
}

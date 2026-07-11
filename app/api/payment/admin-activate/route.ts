import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getMonthDateRange } from '@/lib/subscription-billing'

// Admin-only: manually activate subscriptions for a pending/failed order
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as any)?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { orderId } = await req.json() as { orderId: string }
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

  const admin = createServiceRoleClient()

  const { data: orderRaw } = await (admin as any)
    .from('mips_orders')
    .select('id, student_id, order_type, package_ids, is_recurring, status')
    .eq('id', orderId)
    .single()

  if (!orderRaw) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (orderRaw.status === 'paid') return NextResponse.json({ ok: true, alreadyPaid: true })

  // Resolve valid_from/valid_until for live packages
  const { data: pkgRows } = await (admin as any)
    .from('subscription_packages')
    .select('id, package_type, month, year')
    .in('id', orderRaw.package_ids)
  const pkgMap = new Map<string, { package_type: string; month: number | null; year: number | null }>(
    (pkgRows ?? []).map((p: any) => [p.id, p])
  )

  const subscriptionRows = (orderRaw.package_ids as string[]).map((packageId) => {
    const pkg = pkgMap.get(packageId)
    const isLivePkg = pkg?.package_type === 'live_month'
    const dates = isLivePkg && pkg.month && pkg.year
      ? getMonthDateRange(pkg.month, pkg.year)
      : { validFrom: null, validUntil: null }
    return {
      student_id:        orderRaw.student_id,
      package_id:        packageId,
      subscription_type: isLivePkg ? 'live' : 'video',
      is_recurring:      orderRaw.is_recurring && isLivePkg,
      status:            'active',
      valid_from:        dates.validFrom,
      valid_until:       dates.validUntil,
    }
  })

  const { error: subError } = await (admin as any)
    .from('student_subscriptions')
    .upsert(subscriptionRows, { onConflict: 'student_id,package_id' })

  if (subError) return NextResponse.json({ error: subError.message }, { status: 500 })

  await (admin as any)
    .from('mips_orders')
    .update({ status: 'paid', updated_at: new Date().toISOString() })
    .eq('id', orderId)

  console.log('[admin-activate] Manually activated order:', orderId, 'by admin:', user.id)
  return NextResponse.json({ ok: true })
}

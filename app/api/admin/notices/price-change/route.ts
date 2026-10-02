import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { sendStudentNotices } from '@/lib/notices'
import { getBillingSettings } from '@/lib/subscription-billing'
import { formatMoney } from '@/lib/currency-format'

// POST /api/admin/notices/price-change  { gradeId, oldPrice, newPrice }
// Admin-only. Before a changed monthly price is ever charged, every student with an active
// recurring live subscription for that grade is told (Terms §7, required by the card schemes):
// in their account, and by WhatsApp to the parent phone.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { admin, user } = auth

  const { gradeId, oldPrice, newPrice } = await req.json() as { gradeId?: string; oldPrice?: number; newPrice?: number }
  if (!gradeId || typeof oldPrice !== 'number' || typeof newPrice !== 'number') {
    return NextResponse.json({ error: 'Missing grade or prices.' }, { status: 400 })
  }
  if (oldPrice === newPrice) return NextResponse.json({ ok: true, notices: 0 })

  const [{ data: grade }, { data: subs }, billing] = await Promise.all([
    (admin as any).from('grades').select('name').eq('id', gradeId).maybeSingle(),
    (admin as any)
      .from('student_subscriptions')
      .select('student_id, package:subscription_packages!inner(grade_id, package_type)')
      .eq('is_recurring', true)
      .eq('status', 'active')
      .eq('package.grade_id', gradeId)
      .eq('package.package_type', 'live_month'),
    getBillingSettings(admin),
  ])
  const studentIds = Array.from(new Set(((subs ?? []) as { student_id: string }[]).map((s) => s.student_id)))
  if (studentIds.length === 0) return NextResponse.json({ ok: true, notices: 0 })

  const gradeName = (grade as any)?.name ?? 'your grade'
  const title = 'Change to your monthly subscription amount'
  const body =
    `The monthly price of ${gradeName} live classes is changing from ${formatMoney(oldPrice)} to ${formatMoney(newPrice)}. ` +
    `The new amount applies from your next automatic renewal (charged on day ${billing.billingDay} of the month). ` +
    `If you prefer not to continue, you can cancel at any time before then from Orders and Subscriptions in your account.`

  try {
    const result = await sendStudentNotices(admin, { studentIds, title, body, createdBy: user.id })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[notices/price-change]', err)
    return NextResponse.json({ error: 'Could not send the price-change notices.' }, { status: 500 })
  }
}

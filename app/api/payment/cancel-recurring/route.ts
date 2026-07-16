import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

// POST /api/payment/cancel-recurring
// Soft-cancels recurring billing: sets is_recurring = false so the cron skips this
// student next month, but keeps the ODRP token alive so the student can undo via
// restore-recurring without needing to re-enter payment details.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { subscriptionId } = await req.json() as { subscriptionId: string }
    if (!subscriptionId) return NextResponse.json({ error: 'Missing subscriptionId' }, { status: 400 })

    const { data: sub } = await (supabase as any)
      .from('student_subscriptions')
      .select('id, student_id, subscription_type, package:subscription_packages(month, year)')
      .eq('id', subscriptionId)
      .eq('student_id', user.id)
      .single()

    if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })

    // Students have no UPDATE policy on student_subscriptions — use the service role
    // for the write (ownership already verified above).
    const admin = createServiceRoleClient()
    const { error: updateError } = await (admin as any)
      .from('student_subscriptions')
      .update({ is_recurring: false, updated_at: new Date().toISOString() })
      .eq('id', subscriptionId)

    if (updateError) {
      console.error('[payment/cancel-recurring] update failed:', updateError)
      return NextResponse.json({ error: 'Could not cancel recurring billing. Please try again.' }, { status: 500 })
    }

    // Notify admins on their Messages page that this student cancelled. Best-effort —
    // never fail the cancellation itself if the notification insert has an issue.
    try {
      const { data: prof } = await (admin as any)
        .from('profiles')
        .select('full_name, grade_id, grade:grades(name)')
        .eq('id', user.id)
        .single()
      const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
      const name = prof?.full_name ?? 'A student'
      const gradeName = (prof?.grade as { name?: string } | null)?.name ?? 'their grade'
      const pkg = sub.package as { month?: number; year?: number } | null
      const monthLabel = pkg?.month ? `${MONTHS[pkg.month - 1]}${pkg.year ? ` ${pkg.year}` : ''}` : 'the current month'
      await (admin as any).from('admin_notifications').insert({
        type: 'subscription_cancelled',
        message: `${name} of ${gradeName} has cancelled their recurring monthly live subscription for ${monthLabel}.`,
        student_id: user.id,
        grade_id: prof?.grade_id ?? null,
      })
    } catch (e) {
      console.error('[payment/cancel-recurring] notification insert failed:', e)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[payment/cancel-recurring]', err)
    return NextResponse.json({ error: 'Could not cancel recurring billing. Please try again.' }, { status: 500 })
  }
}

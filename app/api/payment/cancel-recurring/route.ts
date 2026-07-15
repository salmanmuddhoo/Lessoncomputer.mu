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
      .select('id, student_id, subscription_type')
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
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[payment/cancel-recurring]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

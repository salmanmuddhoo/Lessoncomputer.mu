import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

// POST /api/payment/restore-recurring
// Reverses a soft-cancel: sets is_recurring = true so the cron resumes billing
// next month. Requires an active ODRP token (kept alive by the soft-cancel flow).
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { subscriptionId } = await req.json() as { subscriptionId: string }
    if (!subscriptionId) return NextResponse.json({ error: 'Missing subscriptionId' }, { status: 400 })

    const { data: sub } = await (supabase as any)
      .from('student_subscriptions')
      .select('id, is_recurring, subscription_type, status')
      .eq('id', subscriptionId)
      .eq('student_id', user.id)
      .eq('subscription_type', 'live')
      .eq('status', 'active')
      .single()

    if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    if (sub.is_recurring) return NextResponse.json({ ok: true }) // already recurring

    const { data: token } = await (supabase as any)
      .from('student_payment_tokens')
      .select('id')
      .eq('student_id', user.id)
      .eq('is_active', true)
      .single()

    if (!token) {
      return NextResponse.json(
        { error: 'No active payment method on file. Please subscribe again from your grade page to set up recurring billing.' },
        { status: 400 }
      )
    }

    // Students have no UPDATE policy on student_subscriptions — use the service role
    // for the write (ownership + active token already verified above).
    const admin = createServiceRoleClient()
    const { error: updateError } = await (admin as any)
      .from('student_subscriptions')
      .update({ is_recurring: true, updated_at: new Date().toISOString() })
      .eq('id', subscriptionId)

    if (updateError) {
      console.error('[payment/restore-recurring] update failed:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[payment/restore-recurring]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

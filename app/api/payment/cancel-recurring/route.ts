import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/payment/cancel-recurring
// Student cancels their recurring live subscription.
// Stops future auto-claims; current month access is unaffected.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { subscriptionId } = await req.json() as { subscriptionId: string }
    if (!subscriptionId) return NextResponse.json({ error: 'Missing subscriptionId' }, { status: 400 })

    // Verify the subscription belongs to this student
    const { data: sub } = await (supabase as any)
      .from('student_subscriptions')
      .select('id, student_id, subscription_type')
      .eq('id', subscriptionId)
      .eq('student_id', user.id)
      .single()

    if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })

    // Mark subscription as non-recurring (access remains until end of period)
    await (supabase as any)
      .from('student_subscriptions')
      .update({ is_recurring: false, updated_at: new Date().toISOString() })
      .eq('id', subscriptionId)

    // Check if student has any other active recurring live subs — if none, deactivate token
    const { data: otherRecurring } = await (supabase as any)
      .from('student_subscriptions')
      .select('id')
      .eq('student_id', user.id)
      .eq('subscription_type', 'live')
      .eq('is_recurring', true)
      .eq('status', 'active')

    if (!otherRecurring?.length) {
      await (supabase as any)
        .from('student_payment_tokens')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('student_id', user.id)
        .eq('is_active', true)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[payment/cancel-recurring]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

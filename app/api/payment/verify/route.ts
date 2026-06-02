import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Polls DB status for the result page poller.
// Activation happens via the IMN callback (/api/payment/callback).
// This endpoint just reflects the current order status so the poller
// knows when the callback has fired and can redirect the student.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { orderId } = await req.json() as { orderId: string }
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

  const { data: orderRaw } = await (supabase as any)
    .from('mips_orders')
    .select('id, status')
    .eq('id', orderId)
    .eq('student_id', user.id)
    .single()

  if (!orderRaw) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  return NextResponse.json({ status: orderRaw.status })
}

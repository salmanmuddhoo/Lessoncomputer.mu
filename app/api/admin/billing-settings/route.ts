import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as any)?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { billingDay, cutoffDay } = await req.json() as { billingDay: number; cutoffDay: number }
  if (!billingDay || !cutoffDay) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const admin = createServiceRoleClient()
  const { error } = await (admin as any)
    .from('site_settings')
    .update({ billing_day: billingDay, cutoff_day: cutoffDay, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

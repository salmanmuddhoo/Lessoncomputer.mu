import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

// POST /api/admin/currency-settings { usdRate }  — admin-only.
// usdRate = MUR per 1 USD (used only to DISPLAY prices in USD abroad). null/0 disables.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if ((me as any)?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { usdRate } = await req.json() as { usdRate: number | null }
    const rate = usdRate == null || Number.isNaN(Number(usdRate)) ? null : Number(usdRate)
    if (rate != null && rate < 0) return NextResponse.json({ error: 'Rate must be positive.' }, { status: 400 })

    const admin = createServiceRoleClient()
    const { error } = await (admin as any)
      .from('site_settings')
      .update({ usd_rate: rate && rate > 0 ? rate : null, updated_at: new Date().toISOString() })
      .eq('id', 1)
    if (error) {
      console.error('[admin/currency-settings]', error)
      return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/currency-settings]', err)
    return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 })
  }
}

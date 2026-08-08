import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

// POST /api/admin/parent-groups/set-year  { year }
// Admin-only. Sets the current academic year — the cohort new enrolments are added to.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { admin } = auth

  const { year } = await req.json() as { year?: number }
  const y = Number(year)
  if (!Number.isInteger(y) || y < 2000 || y > 2100) {
    return NextResponse.json({ error: 'A valid academic year is required.' }, { status: 400 })
  }

  const { error } = await (admin as any)
    .from('site_settings')
    .update({ current_academic_year: y })
    .eq('id', 1)
  if (error) {
    console.error('[parent-groups/set-year] failed', error)
    return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

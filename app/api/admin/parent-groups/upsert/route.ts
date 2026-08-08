import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { ensureCohort } from '@/lib/parent-groups'

// POST /api/admin/parent-groups/upsert  { gradeId, academicYear, name?, whatsappGroupUrl? }
// Admin-only. Creates the cohort if needed and updates its name / WhatsApp invite link.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { admin } = auth

  const { gradeId, academicYear, name, whatsappGroupUrl } = await req.json() as {
    gradeId?: string; academicYear?: number; name?: string; whatsappGroupUrl?: string
  }
  const year = Number(academicYear)
  if (!gradeId || !Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: 'A grade and a valid academic year are required.' }, { status: 400 })
  }

  const cohort = await ensureCohort(admin, gradeId, year)
  if (!cohort) return NextResponse.json({ error: 'Could not create the cohort.' }, { status: 500 })

  const patch: Record<string, unknown> = {}
  if (typeof name === 'string') patch.name = name.trim() || null
  if (typeof whatsappGroupUrl === 'string') patch.whatsapp_group_url = whatsappGroupUrl.trim() || null

  if (Object.keys(patch).length > 0) {
    const { error } = await (admin as any).from('parent_groups').update(patch).eq('id', cohort.id)
    if (error) {
      console.error('[parent-groups/upsert] update failed', error)
      return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, cohortId: cohort.id })
}

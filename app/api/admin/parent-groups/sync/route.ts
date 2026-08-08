import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { ensureCohort } from '@/lib/parent-groups'

// POST /api/admin/parent-groups/sync  { gradeId, academicYear }
// Admin-only. Adds every active student of the grade who has a parent phone on file into
// the (grade, year) cohort. Backfills cohorts for students who provided a parent number
// before the feature existed, or whose number was set by an admin. Idempotent.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { admin } = auth

  const { gradeId, academicYear } = await req.json() as { gradeId?: string; academicYear?: number }
  const year = Number(academicYear)
  if (!gradeId || !Number.isInteger(year)) {
    return NextResponse.json({ error: 'A grade and academic year are required.' }, { status: 400 })
  }

  const cohort = await ensureCohort(admin, gradeId, year)
  if (!cohort) return NextResponse.json({ error: 'Could not create the cohort.' }, { status: 500 })

  // Active students of this grade who have a parent phone on file.
  const { data: students } = await (admin as any)
    .from('profiles')
    .select('id, parent_phone')
    .eq('grade_id', gradeId)
    .eq('role', 'student')
    .neq('is_active', false)
    .not('parent_phone', 'is', null)

  const rows = ((students ?? []) as any[])
    .filter((s) => (s.parent_phone ?? '').trim().length >= 7)
    .map((s) => ({ parent_group_id: cohort.id, student_id: s.id, parent_phone: s.parent_phone.trim() }))

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, added: 0, message: 'No students with a parent number in this grade yet.' })
  }

  const { error } = await (admin as any)
    .from('parent_group_members')
    .upsert(rows, { onConflict: 'parent_group_id,student_id' })
  if (error) {
    console.error('[parent-groups/sync] upsert failed', error)
    return NextResponse.json({ error: 'Could not sync students.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, added: rows.length })
}

// Helpers for parent WhatsApp cohorts (per grade + academic year). All writes go through
// the service-role client, so callers MUST do their own auth/authorization first.

type Admin = any // service-role SupabaseClient (DB types are hand-written; see lib/types)

/** Admin-configured current academic year; falls back to the current calendar year. */
export async function getCurrentAcademicYear(admin: Admin): Promise<number> {
  const { data } = await admin
    .from('site_settings')
    .select('current_academic_year')
    .eq('id', 1)
    .maybeSingle()
  return (data?.current_academic_year as number | null) ?? new Date().getFullYear()
}

/** Find or create the cohort row for a (grade, year). Returns id + invite link. */
export async function ensureCohort(
  admin: Admin,
  gradeId: string,
  year: number
): Promise<{ id: string; whatsapp_group_url: string | null } | null> {
  const { data: existing } = await admin
    .from('parent_groups')
    .select('id, whatsapp_group_url')
    .eq('grade_id', gradeId)
    .eq('academic_year', year)
    .maybeSingle()
  if (existing) return existing

  const { data: grade } = await admin.from('grades').select('name').eq('id', gradeId).maybeSingle()
  const name = `${grade?.name ?? 'Grade'} — ${year}`

  const { data: created, error } = await admin
    .from('parent_groups')
    .insert({ grade_id: gradeId, academic_year: year, name })
    .select('id, whatsapp_group_url')
    .single()
  if (error) {
    console.error('[parent-groups] ensureCohort insert failed', error)
    return null
  }
  return created
}

/**
 * Add (or refresh) a student's parent in the CURRENT-year cohort for their grade.
 * Idempotent per (cohort, student). Returns the cohort's invite link so the caller can
 * send it to the parent. Never throws — logs and returns null on failure.
 */
export async function addParentToCurrentCohort(
  admin: Admin,
  studentId: string,
  gradeId: string,
  parentPhone: string
): Promise<{ cohortId: string; groupUrl: string | null } | null> {
  try {
    const year = await getCurrentAcademicYear(admin)
    const cohort = await ensureCohort(admin, gradeId, year)
    if (!cohort) return null

    await admin
      .from('parent_group_members')
      .upsert(
        { parent_group_id: cohort.id, student_id: studentId, parent_phone: parentPhone },
        { onConflict: 'parent_group_id,student_id' }
      )

    return { cohortId: cohort.id, groupUrl: cohort.whatsapp_group_url ?? null }
  } catch (err) {
    console.error('[parent-groups] addParentToCurrentCohort failed', err)
    return null
  }
}

// Account notices (Developer Work §6): the in-account message is the primary channel and is
// always written first; WhatsApp to the parent phone is additional and best-effort. Uses the
// approved `parent_report` template ({{1}} parent name, {{2}} message) so delivery works outside
// WhatsApp's 24-hour window. Callers must have verified the requester is an admin.
import { sendWhatsAppTemplate, isWhatsAppConfigured } from '@/lib/whatsapp'
import { getCurrentAcademicYear } from '@/lib/parent-groups'

type Admin = any // service-role SupabaseClient

// Template parameters may not contain newlines/tabs or 4+ consecutive spaces.
const toTemplateParam = (title: string, body: string) =>
  `${title}: ${body}`.replace(/[\r\n\t]+/g, ' ').replace(/ {4,}/g, ' ').trim()

async function whatsappAll(phones: string[], title: string, body: string) {
  if (!isWhatsAppConfigured() || phones.length === 0) return { sent: 0, failed: phones.length }
  const unique = Array.from(new Set(phones.map((p) => p.trim()).filter((p) => p.length >= 7)))
  const results = await Promise.allSettled(
    unique.map((p) => sendWhatsAppTemplate(p, 'parent_report', 'en', ['Parent', toTemplateParam(title, body)]))
  )
  const sent = results.filter((r) => r.status === 'fulfilled' && r.value.ok).length
  return { sent, failed: unique.length - sent }
}

// One notice per student (shown only to that student) + WhatsApp to each parent phone.
export async function sendStudentNotices(
  admin: Admin,
  { studentIds, title, body, createdBy }: { studentIds: string[]; title: string; body: string; createdBy: string }
) {
  if (studentIds.length === 0) return { notices: 0, whatsappSent: 0, whatsappFailed: 0 }
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, grade_id, parent_phone')
    .in('id', studentIds)
  const rows = ((profiles ?? []) as { id: string; grade_id: string | null; parent_phone: string | null }[])
    .filter((p) => p.grade_id)
  if (rows.length > 0) {
    const { error } = await admin.from('broadcasts').insert(rows.map((p) => ({
      title, body, grade_id: p.grade_id, target_audience: 'all', created_by: createdBy, student_id: p.id,
    })))
    if (error) throw new Error(`In-account notice failed: ${error.message}`)
  }
  const wa = await whatsappAll(rows.map((p) => p.parent_phone ?? ''), title, body)
  return { notices: rows.length, whatsappSent: wa.sent, whatsappFailed: wa.failed }
}

// A grade-wide notice to live-class students + WhatsApp to that grade's current parent cohort.
export async function sendGradeLiveNotice(
  admin: Admin,
  { gradeId, title, body, createdBy }: { gradeId: string; title: string; body: string; createdBy: string }
) {
  const { error } = await admin.from('broadcasts').insert({
    title, body, grade_id: gradeId, target_audience: 'live', created_by: createdBy,
  })
  if (error) throw new Error(`In-account notice failed: ${error.message}`)

  const year = await getCurrentAcademicYear(admin)
  const { data: cohort } = await admin
    .from('parent_groups').select('id').eq('grade_id', gradeId).eq('academic_year', year).maybeSingle()
  let phones: string[] = []
  if (cohort?.id) {
    const { data: members } = await admin
      .from('parent_group_members').select('parent_phone').eq('parent_group_id', cohort.id)
    phones = ((members ?? []) as { parent_phone: string | null }[]).map((m) => m.parent_phone ?? '')
  }
  const wa = await whatsappAll(phones, title, body)
  return { notices: 1, whatsappSent: wa.sent, whatsappFailed: wa.failed }
}

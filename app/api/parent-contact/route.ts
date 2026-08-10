import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { addParentToCurrentCohort } from '@/lib/parent-groups'
import { sendWhatsAppText } from '@/lib/whatsapp'

// POST /api/parent-contact  { phone }
// A student provides their parent's number (mandatory to join live classes). We save it,
// enrol the parent into their grade's CURRENT-year WhatsApp cohort, and — if that cohort
// has a real WhatsApp group invite link — send it so the parent can self-join (the WhatsApp
// API cannot add them automatically). Cooldown prevents send-spam.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { phone } = await req.json() as { phone?: string }
  // Full international number, digits only (country code + local number).
  const trimmedPhone = (phone ?? '').replace(/[^\d]/g, '')
  if (trimmedPhone.length < 8) {
    return NextResponse.json({ error: 'A valid phone number with country code is required' }, { status: 400 })
  }

  // The student may only set their OWN parent phone (RLS also enforces this).
  const { error: profileError } = await (supabase as any)
    .from('profiles')
    .update({ parent_phone: trimmedPhone })
    .eq('id', user.id)
  if (profileError) {
    console.error('[parent-contact] save failed', profileError)
    return NextResponse.json({ error: 'Could not save the number. Please try again.' }, { status: 500 })
  }

  const admin = createServiceRoleClient()

  // Which grade does this student belong to? (Needed to pick the right cohort.)
  const { data: prof } = await (admin as any)
    .from('profiles')
    .select('grade_id, parent_whatsapp_sent_at')
    .eq('id', user.id)
    .maybeSingle()
  const gradeId = (prof as any)?.grade_id as string | null

  let groupUrl: string | null = null
  let cohortId: string | null = null
  if (gradeId) {
    const res = await addParentToCurrentCohort(admin, user.id, gradeId, trimmedPhone)
    groupUrl = res?.groupUrl ?? null
    cohortId = res?.cohortId ?? null
  }

  // Send the grade's group invite link — but at most once (don't re-spam on every edit).
  const alreadySent = !!(prof as any)?.parent_whatsapp_sent_at
  if (groupUrl && !alreadySent) {
    const sent = await sendWhatsAppText(
      trimmedPhone,
      `Hello! Your child has enrolled in live classes at Lesson Computer. ` +
      `Join the parents' WhatsApp group for their class to stay updated:\n\n${groupUrl}`
    )
    if (sent.ok) {
      const now = new Date().toISOString()
      await (admin as any).from('profiles').update({ parent_whatsapp_sent_at: now }).eq('id', user.id)
      if (cohortId) {
        await (admin as any)
          .from('parent_group_members')
          .update({ invite_sent_at: now })
          .eq('parent_group_id', cohortId)
          .eq('student_id', user.id)
      }
    }
  }

  return NextResponse.json({ ok: true })
}

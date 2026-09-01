import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

// POST /api/messages/new  { subject, body }
// A signed-in student starting a new conversation with admin from their dashboard
// (Messages > Contact Admin) — same underlying table as the public /contact form, but
// name/email/grade come from the session instead of a form.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subject, body } = await req.json() as { subject?: string; body?: string }
  const trimmedSubject = (subject ?? '').trim().slice(0, 300)
  const trimmedBody = (body ?? '').trim().slice(0, 5000)
  if (!trimmedSubject || !trimmedBody) {
    return NextResponse.json({ error: 'Subject and message are required.' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, grade_id')
    .eq('id', user.id)
    .single()

  const admin = createServiceRoleClient()
  const { data: row, error } = await (admin as any)
    .from('contact_messages')
    .insert({
      name: (profile as any)?.full_name ?? user.email ?? 'Student',
      email: user.email ?? '',
      subject: trimmedSubject,
      body: trimmedBody,
      student_id: user.id,
      grade_id: (profile as any)?.grade_id ?? null,
    })
    .select('id')
    .single()

  if (error || !row) {
    console.error('[messages/new] insert failed', error)
    return NextResponse.json({ error: 'Could not send your message. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: row.id })
}

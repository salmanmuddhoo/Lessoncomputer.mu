import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

// POST /api/contact  { name, email, subject, body }
// Public contact form submission. If the sender is logged in, we capture their student_id
// and current grade_id so admins can see which student (and grade) the message is from.
export async function POST(req: NextRequest) {
  const { name, email, subject, body } = await req.json() as {
    name?: string; email?: string; subject?: string; body?: string
  }

  const trimmedName = (name ?? '').trim().slice(0, 200)
  const trimmedEmail = (email ?? '').trim().slice(0, 320)
  const trimmedSubject = (subject ?? '').trim().slice(0, 300)
  const trimmedBody = (body ?? '').trim().slice(0, 5000)

  if (!trimmedName || !trimmedEmail || !trimmedSubject || !trimmedBody) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  // Attach the sender's student_id/grade_id when they're logged in — best-effort, the form
  // works for signed-out visitors too.
  let studentId: string | null = null
  let gradeId: string | null = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      studentId = user.id
      const { data: profile } = await supabase
        .from('profiles')
        .select('grade_id')
        .eq('id', user.id)
        .single()
      gradeId = (profile as { grade_id: string | null } | null)?.grade_id ?? null
    }
  } catch {
    // Not logged in / session lookup failed — still accept the message.
  }

  const admin = createServiceRoleClient()
  const { error } = await (admin as any)
    .from('contact_messages')
    .insert({
      name: trimmedName,
      email: trimmedEmail,
      subject: trimmedSubject,
      body: trimmedBody,
      student_id: studentId,
      grade_id: gradeId,
    })

  if (error) {
    console.error('[contact] insert failed', error)
    return NextResponse.json({ error: 'Could not send your message. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

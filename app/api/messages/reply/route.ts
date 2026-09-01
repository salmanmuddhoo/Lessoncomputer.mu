import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

// POST /api/messages/reply  { contactMessageId, body }
// Posts a reply into a contact_messages thread — usable by both the admin (any thread)
// and the student who owns the thread. Runs through the service role so the reply/read
// bookkeeping (bumping the thread back to unread for the recipient) is consistent
// regardless of which side is replying.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { contactMessageId, body } = await req.json() as { contactMessageId?: string; body?: string }
  const trimmedBody = (body ?? '').trim().slice(0, 5000)
  if (!contactMessageId || !trimmedBody) {
    return NextResponse.json({ error: 'A message is required.' }, { status: 400 })
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  const admin = createServiceRoleClient()

  const { data: thread } = await (admin as any)
    .from('contact_messages')
    .select('id, student_id')
    .eq('id', contactMessageId)
    .single()
  if (!thread) return NextResponse.json({ error: 'Message thread not found.' }, { status: 404 })

  // A student may only reply on their OWN thread.
  if (!isAdmin && thread.student_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const senderRole = isAdmin ? 'admin' : 'student'
  const { error: insertError } = await (admin as any)
    .from('contact_message_replies')
    .insert({ contact_message_id: contactMessageId, sender_role: senderRole, sender_id: user.id, body: trimmedBody })
  if (insertError) {
    console.error('[messages/reply] insert failed', insertError)
    return NextResponse.json({ error: 'Could not send your reply. Please try again.' }, { status: 500 })
  }

  // Bump the thread's unread state for the RECIPIENT: a student reply re-opens it for the
  // admin inbox badge; an admin reply is what the student's own unread-reply count reads.
  if (senderRole === 'student') {
    await (admin as any).from('contact_messages').update({ is_read: false }).eq('id', contactMessageId)
  }

  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { sendStudentNotices } from '@/lib/notices'

// POST /api/admin/parent-groups/send-report  { studentId, message }
// Admin-only. A message about one student's attendance or conduct: always written to that
// student's account (the primary channel, Developer Work §6), and sent PRIVATELY by WhatsApp to
// that student's parent (never to the group — a report must not be visible to other parents).
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { admin, user } = auth

  const { studentId, message } = await req.json() as { studentId?: string; message?: string }
  if (!studentId) return NextResponse.json({ error: 'Missing student.' }, { status: 400 })
  if (!message || !message.trim()) return NextResponse.json({ error: 'Report cannot be empty.' }, { status: 400 })

  try {
    const result = await sendStudentNotices(admin, {
      studentIds: [studentId],
      title: 'Message from your teacher',
      body: message.trim(),
      createdBy: user.id,
    })
    if (result.notices === 0) {
      return NextResponse.json({ error: 'Could not find this student’s grade to file the message.' }, { status: 400 })
    }
    return NextResponse.json({
      ok: true,
      ...result,
      warning: result.whatsappSent === 0 ? 'Saved in the student’s account, but the WhatsApp message to the parent could not be sent.' : undefined,
    })
  } catch (err) {
    console.error('[send-report]', err)
    return NextResponse.json({ error: 'Could not send the report.' }, { status: 500 })
  }
}

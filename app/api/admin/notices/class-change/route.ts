import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { sendGradeLiveNotice } from '@/lib/notices'

// POST /api/admin/notices/class-change  { gradeId, classTitle, kind: 'moved' | 'cancelled', detail? }
// Admin-only. Tells a grade's live-class students (in their account) and their parents (by
// WhatsApp) that a class was moved or cancelled — Terms §6, Delivery Policy §4.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { admin, user } = auth

  const { gradeId, classTitle, kind, detail } = await req.json() as {
    gradeId?: string; classTitle?: string; kind?: 'moved' | 'cancelled'; detail?: string
  }
  if (!gradeId || !classTitle || (kind !== 'moved' && kind !== 'cancelled')) {
    return NextResponse.json({ error: 'Missing class details.' }, { status: 400 })
  }

  const title = kind === 'moved' ? `Live class moved: ${classTitle}` : `Live class cancelled: ${classTitle}`
  const body = kind === 'moved'
    ? `The live class "${classTitle}" has a new time${detail ? `: ${detail}` : ''}. Please check the schedule in your account.`
    : `The live class "${classTitle}" has been cancelled.${detail ? ` ${detail}` : ''} We will tell you about any replacement session in your account.`

  try {
    const result = await sendGradeLiveNotice(admin, { gradeId, title, body, createdBy: user.id })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[notices/class-change]', err)
    return NextResponse.json({ error: 'Could not send the class notice.' }, { status: 500 })
  }
}

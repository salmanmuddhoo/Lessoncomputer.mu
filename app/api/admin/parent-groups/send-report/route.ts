import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { sendWhatsAppText, isWhatsAppConfigured } from '@/lib/whatsapp'

// POST /api/admin/parent-groups/send-report  { studentId, message }
// Admin-only. Sends an individual report PRIVATELY to that student's parent (never to the
// group — a report must not be visible to other parents).
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { admin } = auth

  const { studentId, message } = await req.json() as { studentId?: string; message?: string }
  if (!studentId) return NextResponse.json({ error: 'Missing student.' }, { status: 400 })
  if (!message || !message.trim()) return NextResponse.json({ error: 'Report cannot be empty.' }, { status: 400 })
  if (!isWhatsAppConfigured()) {
    return NextResponse.json({ error: 'WhatsApp is not configured on the server.' }, { status: 503 })
  }

  const { data: student } = await (admin as any)
    .from('profiles')
    .select('parent_phone, full_name')
    .eq('id', studentId)
    .maybeSingle()
  const phone = ((student as any)?.parent_phone ?? '').trim()
  if (phone.length < 7) {
    return NextResponse.json({ error: 'This student has no parent phone number on file.' }, { status: 400 })
  }

  const result = await sendWhatsAppText(phone, message.trim())
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'Could not send the report.' }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { sendWhatsAppText, isWhatsAppConfigured } from '@/lib/whatsapp'

export const maxDuration = 60

// POST /api/admin/parent-groups/broadcast  { cohortId, message }
// Admin-only. Sends `message` privately (1-to-1) to every parent in the cohort. This is
// how "message all parents of a grade" works without a real group post (which the WhatsApp
// API cannot do). Returns per-recipient success/failure counts.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { admin } = auth

  const { cohortId, message } = await req.json() as { cohortId?: string; message?: string }
  if (!cohortId) return NextResponse.json({ error: 'Missing cohort.' }, { status: 400 })
  if (!message || !message.trim()) return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 })
  if (!isWhatsAppConfigured()) {
    return NextResponse.json({ error: 'WhatsApp is not configured on the server.' }, { status: 503 })
  }

  const { data: members } = await (admin as any)
    .from('parent_group_members')
    .select('parent_phone')
    .eq('parent_group_id', cohortId)

  const phones = Array.from(new Set(
    ((members ?? []) as any[]).map((m) => (m.parent_phone ?? '').trim()).filter((p: string) => p.length >= 7)
  ))
  if (phones.length === 0) {
    return NextResponse.json({ error: 'This cohort has no parents with a phone number yet.' }, { status: 400 })
  }

  const body = message.trim()
  const results = await Promise.allSettled(phones.map((p) => sendWhatsAppText(p, body)))
  const sent = results.filter((r) => r.status === 'fulfilled' && (r.value as any).ok).length
  const failed = phones.length - sent

  return NextResponse.json({ ok: true, total: phones.length, sent, failed })
}

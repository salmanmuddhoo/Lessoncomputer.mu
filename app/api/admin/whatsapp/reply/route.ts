import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { sendWhatsAppText, isWhatsAppConfigured } from '@/lib/whatsapp'

// POST /api/admin/whatsapp/reply  { conversationId, message }
// Admin-only. Sends a free-form reply to a parent who has messaged in (only works within
// WhatsApp's 24h customer-service window, which their inbound message opened), and records
// it in the thread.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { admin, user } = auth

  const { conversationId, message } = await req.json() as { conversationId?: string; message?: string }
  if (!conversationId) return NextResponse.json({ error: 'Missing conversation.' }, { status: 400 })
  if (!message || !message.trim()) return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 })
  if (!isWhatsAppConfigured()) {
    return NextResponse.json({ error: 'WhatsApp is not configured on the server.' }, { status: 503 })
  }

  const { data: convo } = await (admin as any)
    .from('whatsapp_conversations')
    .select('id, phone')
    .eq('id', conversationId)
    .maybeSingle()
  if (!convo) return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 })

  const body = message.trim()
  const result = await sendWhatsAppText(convo.phone, body)
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'Could not send the message.' }, { status: 502 })
  }

  await (admin as any)
    .from('whatsapp_messages')
    .insert({
      conversation_id: convo.id,
      direction: 'out',
      body,
      status: 'sent',
      sender_admin_id: user.id,
    })

  await (admin as any)
    .from('whatsapp_conversations')
    .update({ last_message_at: new Date().toISOString(), last_message_preview: body.slice(0, 200) })
    .eq('id', convo.id)

  return NextResponse.json({ ok: true })
}

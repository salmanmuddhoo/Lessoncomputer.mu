import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

// POST /api/admin/whatsapp/delete  { conversationId }
// Admin-only. Permanently deletes a conversation and its message history (whatsapp_messages
// cascades on the FK). The parent's phone number drops off the inbox list and only reappears
// as a fresh conversation if they message in again — this keeps a long-running inbox from
// accumulating every parent who has ever texted.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { admin } = auth

  const { conversationId } = await req.json() as { conversationId?: string }
  if (!conversationId) return NextResponse.json({ error: 'Missing conversation.' }, { status: 400 })

  const { error } = await (admin as any)
    .from('whatsapp_conversations')
    .delete()
    .eq('id', conversationId)
  if (error) return NextResponse.json({ error: 'Could not delete the conversation.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}

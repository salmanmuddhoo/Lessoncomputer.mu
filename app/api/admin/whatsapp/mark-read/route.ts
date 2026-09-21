import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

// POST /api/admin/whatsapp/mark-read  { conversationId }
// Admin-only. Clears the unread badge for a conversation once the admin opens it.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { admin } = auth

  const { conversationId } = await req.json() as { conversationId?: string }
  if (!conversationId) return NextResponse.json({ error: 'Missing conversation.' }, { status: 400 })

  const { error } = await (admin as any)
    .from('whatsapp_conversations')
    .update({ unread_count: 0 })
    .eq('id', conversationId)
  if (error) return NextResponse.json({ error: 'Could not mark as read.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}

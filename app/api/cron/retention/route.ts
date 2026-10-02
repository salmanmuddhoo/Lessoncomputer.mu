import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

const MONTH = 30 * 24 * 60 * 60 * 1000

// GET /api/cron/retention — daily data-retention job (Privacy Policy §12, Developer Work §6):
//  - closed accounts: deleted 12 months after closure. Deleting the auth user cascades to the
//    profile, parent phone number, class-group copies, attendance, progress and read receipts;
//    payment/transaction records are kept (mips_orders.student_id → null) for 7-year tax law.
//  - WhatsApp conversations: deleted 24 months after the last message.
//  - Contact-form threads: deleted 24 months after the last message or reply.
export async function GET(req: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret || req.headers.get('authorization') !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createServiceRoleClient() as any
  const now = Date.now()
  const closedCutoff = new Date(now - 12 * MONTH).toISOString()
  const messageCutoff = new Date(now - 24 * MONTH).toISOString()
  const result = { accountsDeleted: 0, accountErrors: 0, whatsappDeleted: 0, contactThreadsDeleted: 0 }

  const { data: closed } = await admin
    .from('profiles')
    .select('id')
    .eq('role', 'student')
    .eq('is_active', false)
    .lt('closed_at', closedCutoff)
    .limit(200)
  for (const p of (closed ?? []) as { id: string }[]) {
    const { error } = await admin.auth.admin.deleteUser(p.id)
    if (error) { result.accountErrors++; console.error('[cron/retention] deleteUser failed', p.id, error) }
    else result.accountsDeleted++
  }

  const { data: oldConvos } = await admin
    .from('whatsapp_conversations')
    .delete()
    .lt('last_message_at', messageCutoff)
    .select('id')
  result.whatsappDeleted = (oldConvos ?? []).length

  // A thread is only expired when neither the message nor any reply is newer than the cutoff.
  const { data: oldThreads } = await admin
    .from('contact_messages')
    .select('id')
    .lt('created_at', messageCutoff)
    .limit(500)
  const threadIds = ((oldThreads ?? []) as { id: string }[]).map((t) => t.id)
  if (threadIds.length > 0) {
    const { data: recentReplies } = await admin
      .from('contact_message_replies')
      .select('contact_message_id')
      .in('contact_message_id', threadIds)
      .gte('created_at', messageCutoff)
    const active = new Set(((recentReplies ?? []) as { contact_message_id: string }[]).map((r) => r.contact_message_id))
    const expired = threadIds.filter((id) => !active.has(id))
    if (expired.length > 0) {
      const { error } = await admin.from('contact_messages').delete().in('id', expired)
      if (error) console.error('[cron/retention] contact thread delete failed', error)
      else result.contactThreadsDeleted = expired.length
    }
  }

  console.log('[cron/retention]', result)
  return NextResponse.json({ ok: true, ...result })
}

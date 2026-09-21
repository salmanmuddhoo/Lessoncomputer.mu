import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { WhatsAppInbox } from '@/components/lc/whatsapp-inbox'

export const metadata: Metadata = { title: 'WhatsApp | Admin' }

export default async function WhatsAppPage() {
  const supabase = await createClient()

  const { data: conversations } = await (supabase as any)
    .from('whatsapp_conversations')
    .select('id, phone, contact_name, last_message_at, last_message_preview, unread_count, student:profiles(full_name, grade:grades!grade_id(name))')
    .order('last_message_at', { ascending: false })

  const initialConversations = ((conversations ?? []) as any[]).map((c) => ({
    id: c.id,
    phone: c.phone,
    contactName: c.contact_name ?? null,
    studentName: (c.student as any)?.full_name ?? null,
    gradeName: (c.student as any)?.grade?.name ?? null,
    lastMessageAt: c.last_message_at,
    lastMessagePreview: c.last_message_preview ?? '',
    unreadCount: c.unread_count ?? 0,
  }))

  return <WhatsAppInbox initialConversations={initialConversations} />
}

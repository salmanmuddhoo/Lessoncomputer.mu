'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Send, Loader2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { formatWhatsAppDisplay } from '@/lib/phone'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Conversation {
  id: string
  phone: string
  contactName: string | null
  studentName: string | null
  lastMessageAt: string
  lastMessagePreview: string
  unreadCount: number
}

interface Message {
  id: string
  direction: 'in' | 'out'
  body: string
  status: string | null
  createdAt: string
}

function conversationLabel(c: Conversation): string {
  return c.studentName ? `${c.studentName}'s parent` : (c.contactName ?? formatWhatsAppDisplay(c.phone))
}

export function WhatsAppInbox({ initialConversations }: { initialConversations: Conversation[] }) {
  const [conversations, setConversations] = useState(initialConversations)
  const [selectedId, setSelectedId] = useState<string | null>(initialConversations[0]?.id ?? null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const selected = conversations.find((c) => c.id === selectedId) ?? null

  // Refresh the conversation list periodically so new inbound messages (via the webhook)
  // show up without a manual reload.
  useEffect(() => {
    const supabase = createClient()
    async function refreshList() {
      const { data } = await (supabase as any)
        .from('whatsapp_conversations')
        .select('id, phone, contact_name, last_message_at, last_message_preview, unread_count, student:profiles(full_name)')
        .order('last_message_at', { ascending: false })
      if (!data) return
      setConversations((data as any[]).map((c) => ({
        id: c.id,
        phone: c.phone,
        contactName: c.contact_name ?? null,
        studentName: (c.student as any)?.full_name ?? null,
        lastMessageAt: c.last_message_at,
        lastMessagePreview: c.last_message_preview ?? '',
        unreadCount: c.unread_count ?? 0,
      })))
    }
    const interval = setInterval(refreshList, 15_000)
    return () => clearInterval(interval)
  }, [])

  async function loadMessages(conversationId: string) {
    setLoadingMessages(true)
    const supabase = createClient()
    const { data } = await (supabase as any)
      .from('whatsapp_messages')
      .select('id, direction, body, status, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    setMessages(((data ?? []) as any[]).map((m) => ({
      id: m.id, direction: m.direction, body: m.body, status: m.status, createdAt: m.created_at,
    })))
    setLoadingMessages(false)
  }

  useEffect(() => {
    if (!selectedId) return
    loadMessages(selectedId)
    fetch('/api/admin/whatsapp/mark-read', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: selectedId }),
    }).catch(() => {})
    setConversations((prev) => prev.map((c) => (c.id === selectedId ? { ...c, unreadCount: 0 } : c)))

    const interval = setInterval(() => loadMessages(selectedId), 10_000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!selected || !reply.trim()) return
    setSending(true)
    const body = reply.trim()
    try {
      const res = await fetch('/api/admin/whatsapp/reply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selected.id, message: body }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data.error ?? 'Could not send.'); return }
      setReply('')
      await loadMessages(selected.id)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><MessageCircle className="w-6 h-6" /> WhatsApp</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Messages from parents who contacted the school WhatsApp number. Replies only deliver
          within 24 hours of their last message (WhatsApp&apos;s customer-service window).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] border rounded-xl overflow-hidden h-[calc(100vh-220px)] min-h-[420px]">
        {/* Conversation list */}
        <div className="border-b md:border-b-0 md:border-r overflow-y-auto">
          {conversations.length === 0 && (
            <p className="text-sm text-muted-foreground p-4">No WhatsApp messages yet.</p>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={cn(
                'w-full text-left p-3 border-b flex items-start gap-2.5 hover:bg-muted/40 transition-colors',
                selectedId === c.id && 'bg-muted/60'
              )}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{conversationLabel(c)}</p>
                  {c.unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none shrink-0">
                      {c.unreadCount > 99 ? '99+' : c.unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{formatWhatsAppDisplay(c.phone)}</p>
                {c.lastMessagePreview && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMessagePreview}</p>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Thread */}
        <div className="flex flex-col min-h-0">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Select a conversation to view messages.
            </div>
          ) : (
            <>
              <div className="p-3 border-b">
                <p className="text-sm font-semibold">{conversationLabel(selected)}</p>
                <p className="text-xs text-muted-foreground">{formatWhatsAppDisplay(selected.phone)}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {loadingMessages && messages.length === 0 && (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={cn('flex', m.direction === 'out' ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words',
                      m.direction === 'out' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}>
                      {m.body}
                      <div className={cn(
                        'text-[10px] mt-1',
                        m.direction === 'out' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      )}>
                        {new Date(m.createdAt).toLocaleString('en-MU', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <div className="p-3 border-t flex items-end gap-2">
                <Textarea
                  rows={2}
                  placeholder="Type a reply…"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
                  }}
                  className="resize-none"
                />
                <Button onClick={send} disabled={sending || !reply.trim()} size="icon">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

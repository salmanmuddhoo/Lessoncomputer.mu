'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageCircle, Send, Loader2, User, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { formatWhatsAppDisplay } from '@/lib/phone'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Conversation {
  id: string
  phone: string
  contactName: string | null
  studentName: string | null
  gradeName: string | null
  lastMessageAt: string
  lastMessagePreview: string
  unreadCount: number
}

const CONVERSATION_SELECT = 'id, phone, contact_name, last_message_at, last_message_preview, unread_count, student:profiles(full_name, grade:grades!grade_id(name))'

function mapConversation(c: any): Conversation {
  return {
    id: c.id,
    phone: c.phone,
    contactName: c.contact_name ?? null,
    studentName: (c.student as any)?.full_name ?? null,
    gradeName: (c.student as any)?.grade?.name ?? null,
    lastMessageAt: c.last_message_at,
    lastMessagePreview: c.last_message_preview ?? '',
    unreadCount: c.unread_count ?? 0,
  }
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
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null)
  const [deleting, setDeleting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const selected = conversations.find((c) => c.id === selectedId) ?? null

  // Unread conversations float to the top so they never get buried once the list grows —
  // an admin scanning a long list needs to spot "who messaged" without scrolling.
  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      if ((a.unreadCount > 0) !== (b.unreadCount > 0)) return a.unreadCount > 0 ? -1 : 1
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    })
  }, [conversations])

  // Refresh the conversation list periodically so new inbound messages (via the webhook)
  // show up without a manual reload.
  useEffect(() => {
    const supabase = createClient()
    async function refreshList() {
      const { data } = await (supabase as any)
        .from('whatsapp_conversations')
        .select(CONVERSATION_SELECT)
        .order('last_message_at', { ascending: false })
      if (!data) return
      setConversations((data as any[]).map(mapConversation))
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

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch('/api/admin/whatsapp/delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: deleteTarget.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data.error ?? 'Could not delete.'); return }
      setConversations((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      if (selectedId === deleteTarget.id) { setSelectedId(null); setMessages([]) }
      toast.success('Conversation deleted.')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

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
          {sortedConversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={cn(
                'w-full text-left p-3 border-b flex items-start gap-2.5 hover:bg-muted/40 transition-colors',
                selectedId === c.id && 'bg-muted/60',
                c.unreadCount > 0 && 'bg-primary/5'
              )}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn('text-sm truncate', c.unreadCount > 0 ? 'font-bold' : 'font-medium')}>
                    {conversationLabel(c)}
                  </p>
                  {c.unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none shrink-0">
                      {c.unreadCount > 99 ? '99+' : c.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs text-muted-foreground truncate">{formatWhatsAppDisplay(c.phone)}</p>
                  {c.gradeName && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">{c.gradeName}</Badge>
                  )}
                </div>
                {c.lastMessagePreview && (
                  <p className={cn('text-xs truncate mt-0.5', c.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                    {c.lastMessagePreview}
                  </p>
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
              <div className="p-3 border-b flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold truncate">{conversationLabel(selected)}</p>
                    {selected.gradeName && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">{selected.gradeName}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{formatWhatsAppDisplay(selected.phone)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTarget(selected)}
                  className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </Button>
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

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm" aria-describedby="delete-whatsapp-desc">
          <DialogHeader>
            <DialogTitle>Delete this conversation?</DialogTitle>
            <DialogDescription id="delete-whatsapp-desc">
              This permanently deletes the message history with{' '}
              {deleteTarget ? conversationLabel(deleteTarget) : 'this parent'}. It will disappear
              from this list and only reappear if they message in again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

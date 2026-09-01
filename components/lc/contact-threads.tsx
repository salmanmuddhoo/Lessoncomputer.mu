'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Mail, Plus, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'

interface Reply {
  id: string
  sender_role: 'admin' | 'student'
  body: string
  is_read: boolean
  created_at: string
}

interface Thread {
  id: string
  subject: string
  body: string
  created_at: string
  replies: Reply[]
}

interface Props {
  threads: Thread[]
}

export function ContactThreads({ threads: initialThreads }: Props) {
  const [threads, setThreads] = useState(initialThreads)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [sendingReply, setSendingReply] = useState<string | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  async function openThread(t: Thread) {
    setExpandedId((prev) => (prev === t.id ? null : t.id))
    const unreadAdminReplies = t.replies.filter((r) => r.sender_role === 'admin' && !r.is_read)
    if (unreadAdminReplies.length === 0) return
    const supabase = createClient()
    await supabase
      .from('contact_message_replies')
      .update({ is_read: true })
      .in('id', unreadAdminReplies.map((r) => r.id))
    setThreads((prev) => prev.map((th) => th.id !== t.id ? th : {
      ...th,
      replies: th.replies.map((r) => r.sender_role === 'admin' ? { ...r, is_read: true } : r),
    }))
  }

  async function sendReply(threadId: string) {
    const draft = (replyDrafts[threadId] ?? '').trim()
    if (!draft) return
    setSendingReply(threadId)
    try {
      const res = await fetch('/api/messages/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactMessageId: threadId, body: draft }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data.error ?? 'Could not send your reply.'); return }
      setThreads((prev) => prev.map((th) => th.id !== threadId ? th : {
        ...th,
        replies: [...th.replies, {
          id: `local-${Date.now()}`, sender_role: 'student', body: draft, is_read: true, created_at: new Date().toISOString(),
        }],
      }))
      setReplyDrafts((prev) => ({ ...prev, [threadId]: '' }))
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSendingReply(null)
    }
  }

  async function sendNew() {
    if (!subject.trim() || !body.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/messages/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data.error ?? 'Could not send your message.'); return }
      setThreads((prev) => [{ id: data.id, subject, body, created_at: new Date().toISOString(), replies: [] }, ...prev])
      setSubject('')
      setBody('')
      setComposeOpen(false)
      toast.success('Message sent to admin')
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-accent" onClick={() => setComposeOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> New Message to Admin
        </Button>
      </div>

      {threads.length === 0 ? (
        <div className="py-20 text-center rounded-xl border border-border/60">
          <Mail className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No conversations yet.</p>
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-accent" onClick={() => setComposeOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Message Admin
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 divide-y divide-border/60 overflow-hidden">
          {threads.map((t) => {
            const isOpen = expandedId === t.id
            const hasUnreadAdminReply = t.replies.some((r) => r.sender_role === 'admin' && !r.is_read)
            return (
              <div key={t.id} className={hasUnreadAdminReply ? 'bg-primary/5' : ''}>
                <button
                  onClick={() => openThread(t)}
                  className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors"
                >
                  <Mail className={`w-4 h-4 mt-0.5 shrink-0 ${hasUnreadAdminReply ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm ${hasUnreadAdminReply ? 'font-semibold' : 'font-medium'}`}>{t.subject}</span>
                      {hasUnreadAdminReply && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.replies.length > 0 ? `${t.replies.length} repl${t.replies.length === 1 ? 'y' : 'ies'}` : 'No replies yet'}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0 whitespace-nowrap">
                    {new Date(t.created_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pl-11 space-y-3">
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground mb-1">You</p>
                      <p className="text-sm whitespace-pre-wrap">{t.body}</p>
                    </div>
                    {t.replies.map((r) => (
                      <div
                        key={r.id}
                        className={`rounded-lg border p-3 ${r.sender_role === 'admin' ? 'border-primary/30 bg-primary/5' : 'border-border/60 bg-muted/20'}`}
                      >
                        <p className="text-xs text-muted-foreground mb-1">{r.sender_role === 'admin' ? 'Admin' : 'You'}</p>
                        <p className="text-sm whitespace-pre-wrap">{r.body}</p>
                      </div>
                    ))}
                    <div className="flex items-end gap-2 pt-1">
                      <Textarea
                        value={replyDrafts[t.id] ?? ''}
                        onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))}
                        placeholder="Write a reply…"
                        className="text-sm min-h-[60px] resize-y"
                      />
                      <Button
                        size="sm"
                        className="bg-primary text-primary-foreground hover:bg-accent shrink-0"
                        disabled={sendingReply === t.id || !(replyDrafts[t.id] ?? '').trim()}
                        onClick={() => sendReply(t.id)}
                      >
                        {sendingReply === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Message Admin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Subject</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What's this about?" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Message</label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message…" className="text-sm min-h-[120px] resize-y" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
            <Button
              onClick={sendNew}
              disabled={sending || !subject.trim() || !body.trim()}
              className="bg-primary text-primary-foreground hover:bg-accent"
            >
              {sending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2, Plus, Pencil, Trash2, Megaphone, Users, Radio, Video, Folder, FolderOpen, ChevronRight, ChevronDown, Bell, Inbox, Mail, GraduationCap, Send } from 'lucide-react'
import { toast } from 'sonner'

const AUDIENCE_LABELS: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  all:   { label: 'All Students',         icon: Users, className: 'bg-primary/10 text-primary border-primary/20' },
  live:  { label: 'Live Classes Only',    icon: Radio, className: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800' },
  video: { label: 'Video Packages Only',  icon: Video, className: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-800' },
}

interface Grade { id: string; name: string; color: string }
interface Chapter { id: string; title: string }
interface Broadcast {
  id: string
  title: string
  body: string
  grade_id: string
  chapter_id: string | null
  target_audience: string
  created_at: string
  grade: { name: string; color: string } | null
  chapter: { title: string } | null
}

interface AdminNotification { id: string; message: string; created_at: string; type: string }
interface ContactReply {
  id: string
  sender_role: 'admin' | 'student'
  body: string
  is_read: boolean
  created_at: string
}

interface ContactMessage {
  id: string
  name: string
  email: string
  subject: string
  body: string
  is_read: boolean
  created_at: string
  student_id: string | null
  student: { full_name: string | null } | null
  grade: { name: string; color: string } | null
  contact_message_replies: ContactReply[]
}

export default function AdminBroadcastsPage() {
  const [tab, setTab] = useState<'sent' | 'inbox'>('sent')
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [sendingReplyId, setSendingReplyId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [openGrades, setOpenGrades] = useState<Record<string, boolean>>({})
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({})

  // Form state
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [gradeId, setGradeId] = useState('')
  const [chapterId, setChapterId] = useState('')
  const [audience, setAudience] = useState('all')

  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: bData }, { data: gData }, { data: nData }, { data: cData }] = await Promise.all([
      (supabase as any)
        .from('broadcasts')
        .select('id, title, body, grade_id, chapter_id, target_audience, created_at, grade:grades(name, color), chapter:chapters(title)')
        .order('created_at', { ascending: false }),
      supabase.from('grades').select('id, name, color').eq('is_active', true).order('order_index'),
      (supabase as any)
        .from('admin_notifications')
        .select('id, message, created_at, type')
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(50),
      (supabase as any)
        .from('contact_messages')
        .select('id, name, email, subject, body, is_read, created_at, student_id, student:profiles(full_name), grade:grades(name, color), contact_message_replies(id, sender_role, body, is_read, created_at)')
        .order('created_at', { ascending: false }),
    ])
    setBroadcasts((bData ?? []) as Broadcast[])
    setNotifications((nData ?? []) as AdminNotification[])
    setContactMessages(((cData ?? []) as ContactMessage[]).map((m) => ({
      ...m,
      contact_message_replies: [...(m.contact_message_replies ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    })))
    const gs = (gData ?? []) as Grade[]
    setGrades(gs)
    if (gs.length > 0 && !gradeId) setGradeId(gs[0].id)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Fetch chapters whenever gradeId changes
  useEffect(() => {
    if (!gradeId) { setChapters([]); return }
    async function fetchChapters() {
      const { data: pkgs } = await supabase
        .from('subscription_packages')
        .select('id')
        .eq('grade_id', gradeId)
        .eq('is_active', true)
      const pkgIds = (pkgs ?? []).map((p: any) => p.id)
      if (pkgIds.length === 0) { setChapters([]); return }
      const { data: spcData } = await supabase
        .from('subscription_package_chapters')
        .select('chapter_id, chapter:chapters(id, title)')
        .in('package_id', pkgIds)
      const seen = new Set<string>()
      const unique: Chapter[] = []
      for (const row of (spcData ?? []) as any[]) {
        const ch = row.chapter
        if (ch && !seen.has(ch.id)) {
          seen.add(ch.id)
          unique.push({ id: ch.id, title: ch.title })
        }
      }
      unique.sort((a, b) => a.title.localeCompare(b.title))
      setChapters(unique)
    }
    fetchChapters()
  }, [gradeId])

  async function dismissNotification(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    await (supabase as any).from('admin_notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
  }

  async function toggleContactRead(id: string, isRead: boolean) {
    setContactMessages((prev) => prev.map((m) => (m.id === id ? { ...m, is_read: isRead } : m)))
    await (supabase as any).from('contact_messages').update({ is_read: isRead }).eq('id', id)
  }

  async function openContactMessage(m: ContactMessage) {
    setExpandedId((prev) => (prev === m.id ? null : m.id))
    if (!m.is_read) toggleContactRead(m.id, true)
    const unreadStudentReplies = m.contact_message_replies.filter((r) => r.sender_role === 'student' && !r.is_read)
    if (unreadStudentReplies.length > 0) {
      await (supabase as any)
        .from('contact_message_replies')
        .update({ is_read: true })
        .in('id', unreadStudentReplies.map((r) => r.id))
      setContactMessages((prev) => prev.map((cm) => cm.id !== m.id ? cm : {
        ...cm,
        contact_message_replies: cm.contact_message_replies.map((r) => r.sender_role === 'student' ? { ...r, is_read: true } : r),
      }))
    }
  }

  async function sendContactReply(threadId: string) {
    const draft = (replyDrafts[threadId] ?? '').trim()
    if (!draft) return
    setSendingReplyId(threadId)
    try {
      const res = await fetch('/api/messages/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactMessageId: threadId, body: draft }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data.error ?? 'Could not send your reply.'); return }
      setContactMessages((prev) => prev.map((cm) => cm.id !== threadId ? cm : {
        ...cm,
        contact_message_replies: [...cm.contact_message_replies, {
          id: `local-${Date.now()}`, sender_role: 'admin', body: draft, is_read: true, created_at: new Date().toISOString(),
        }],
      }))
      setReplyDrafts((prev) => ({ ...prev, [threadId]: '' }))
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSendingReplyId(null)
    }
  }

  async function deleteContactMessage(id: string) {
    const { error } = await (supabase as any).from('contact_messages').delete().eq('id', id)
    if (error) toast.error(error.message)
    else {
      toast.success('Message deleted')
      setContactMessages((prev) => prev.filter((m) => m.id !== id))
    }
    setDeleteContactId(null)
  }

  const unreadContactCount = contactMessages.filter((m) => !m.is_read).length

  function openNew() {
    setEditingId(null)
    setTitle('')
    setBody('')
    setAudience('all')
    setChapterId('')
    if (grades.length > 0) setGradeId(grades[0].id)
    setDialogOpen(true)
  }

  function openEdit(b: Broadcast) {
    setEditingId(b.id)
    setTitle(b.title)
    setBody(b.body)
    setAudience(b.target_audience)
    setGradeId(b.grade_id)
    setChapterId(b.chapter_id ?? '')
    setDialogOpen(true)
  }

  async function handleSend() {
    if (!title.trim() || !body.trim() || !gradeId) return
    setSaving(true)
    if (editingId) {
      // Edit an already-sent message in place.
      const { error } = await (supabase as any)
        .from('broadcasts')
        .update({
          title: title.trim(),
          body: body.trim(),
          grade_id: gradeId,
          chapter_id: chapterId || null,
          target_audience: audience,
        })
        .eq('id', editingId)
      if (error) toast.error(`Failed: ${error.message}`)
      else { toast.success('Message updated'); setDialogOpen(false); load() }
      setSaving(false)
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await (supabase as any)
      .from('broadcasts')
      .insert({
        title: title.trim(),
        body: body.trim(),
        grade_id: gradeId,
        chapter_id: chapterId || null,
        target_audience: audience,
        created_by: user!.id,
      })
    if (error) {
      toast.error(`Failed: ${error.message}`)
    } else {
      toast.success('Message sent')
      setDialogOpen(false)
      load()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const { error } = await (supabase as any).from('broadcasts').delete().eq('id', id)
    if (error) toast.error(error.message)
    else {
      toast.success('Message deleted')
      setBroadcasts((prev) => prev.filter((b) => b.id !== id))
    }
    setDeleteId(null)
  }

  function toggleGrade(k: string) { setOpenGrades((p) => ({ ...p, [k]: !p[k] })) }
  function toggleChapter(k: string) { setOpenChapters((p) => ({ ...p, [k]: !p[k] })) }

  // Organise messages into a grade → (General + chapter) folder tree. Grades follow their
  // configured order; within a grade, chapter folders are alphabetical with "General" last.
  const gradeOrder = new Map(grades.map((g, i) => [g.id, i]))
  const gradeGroups = (() => {
    const byGrade = new Map<string, { id: string; name: string; color: string; items: Broadcast[] }>()
    for (const b of broadcasts) {
      let g = byGrade.get(b.grade_id)
      if (!g) { g = { id: b.grade_id, name: b.grade?.name ?? 'Unknown Grade', color: b.grade?.color ?? '#888888', items: [] }; byGrade.set(b.grade_id, g) }
      g.items.push(b)
    }
    return Array.from(byGrade.values())
      .sort((a, b) => (gradeOrder.get(a.id) ?? 999) - (gradeOrder.get(b.id) ?? 999))
      .map((g) => {
        const byChapter = new Map<string, { key: string; title: string; items: Broadcast[] }>()
        for (const b of g.items) {
          const ck = b.chapter_id ?? '__general__'
          let c = byChapter.get(ck)
          if (!c) { c = { key: ck, title: b.chapter?.title ?? 'General', items: [] }; byChapter.set(ck, c) }
          c.items.push(b)
        }
        const chapters = Array.from(byChapter.values()).sort((a, b) => {
          if (a.key === '__general__') return 1
          if (b.key === '__general__') return -1
          return a.title.localeCompare(b.title)
        })
        return { ...g, chapters }
      })
  })()

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {tab === 'sent' ? 'Send homework, reminders, or announcements to students by grade' : 'Messages from the public contact form and students'}
          </p>
        </div>
        {tab === 'sent' && (
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-accent" onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> New Message
          </Button>
        )}
      </div>

      {/* Tabs: outbound (Sent) vs inbound (Inbox) */}
      <div className="flex items-center gap-1 mb-8 border-b border-border/60">
        <button
          onClick={() => setTab('sent')}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'sent' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="inline-flex items-center gap-1.5"><Megaphone className="w-3.5 h-3.5" /> Sent</span>
        </button>
        <button
          onClick={() => setTab('inbox')}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'inbox' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Inbox className="w-3.5 h-3.5" /> Inbox
            {unreadContactCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{unreadContactCount}</span>
            )}
          </span>
        </button>
      </div>

      {/* System notifications (e.g. subscription cancellations) */}
      {tab === 'sent' && !loading && notifications.length > 0 && (
        <div className="mb-8 rounded-xl border border-amber-300 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-amber-500 shrink-0" />
            <h2 className="font-semibold text-sm">Notifications</h2>
            <span className="text-xs text-muted-foreground">({notifications.length})</span>
          </div>
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-start justify-between gap-3 text-sm bg-background/60 rounded-lg px-3 py-2 border border-amber-200 dark:border-amber-900/40">
                <div className="min-w-0">
                  <p>{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(n.created_at).toLocaleString('en-MU', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <button
                  onClick={() => dismissNotification(n.id)}
                  className="text-xs text-muted-foreground hover:text-foreground shrink-0 underline"
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'sent' && (loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="py-20 text-center rounded-xl border border-border/60">
          <Megaphone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No messages sent yet.</p>
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-accent" onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> Send First Message
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {gradeGroups.map((g) => {
            const gradeOpen = openGrades[g.id] ?? false
            return (
              <div key={g.id} className="rounded-xl border border-border/60 overflow-hidden">
                {/* Grade folder */}
                <button
                  onClick={() => toggleGrade(g.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                >
                  {gradeOpen
                    ? <FolderOpen className="w-4 h-4 shrink-0" style={{ color: g.color }} />
                    : <Folder className="w-4 h-4 shrink-0" style={{ color: g.color }} />}
                  <Badge
                    variant="outline"
                    style={{ borderColor: `${g.color}40`, color: g.color, backgroundColor: `${g.color}10` }}
                  >
                    {g.name}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto mr-1">
                    {g.items.length} message{g.items.length !== 1 ? 's' : ''}
                  </span>
                  {gradeOpen
                    ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                </button>

                {/* Chapter sub-folders */}
                {gradeOpen && (
                  <div className="border-t border-border/40 bg-muted/10 px-2 py-2 space-y-1.5">
                    {g.chapters.map((ch) => {
                      const chKey = `${g.id}::${ch.key}`
                      const chOpen = openChapters[chKey] ?? false
                      return (
                        <div key={chKey} className="rounded-lg border border-border/50 bg-background overflow-hidden">
                          <button
                            onClick={() => toggleChapter(chKey)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/30 transition-colors text-left"
                          >
                            {chOpen
                              ? <FolderOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                              : <Folder className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                            <span className="text-sm font-medium flex-1">{ch.title}</span>
                            <span className="text-xs text-muted-foreground mr-1">
                              {ch.items.length} message{ch.items.length !== 1 ? 's' : ''}
                            </span>
                            {chOpen
                              ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                          </button>

                          {/* Messages inside the chapter */}
                          {chOpen && (
                            <div className="border-t border-border/30 divide-y divide-border/30">
                              {ch.items.map((b) => {
                                const aud = AUDIENCE_LABELS[b.target_audience] ?? AUDIENCE_LABELS.all
                                const AudIcon = aud.icon
                                return (
                                  <div key={b.id} className="flex items-start gap-3 px-3 py-2.5">
                                    <Megaphone className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                    <div className="min-w-0 flex-1">
                                      <p className="font-medium text-sm line-clamp-1">{b.title}</p>
                                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{b.body}</p>
                                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                        <Badge variant="outline" className={`gap-1 text-[10px] px-1.5 py-0 h-4 ${aud.className}`}>
                                          <AudIcon className="w-2.5 h-2.5" />
                                          {aud.label}
                                        </Badge>
                                        <span className="text-[11px] text-muted-foreground">
                                          {new Date(b.created_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => openEdit(b)}
                                        aria-label="Edit message"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                                        onClick={() => setDeleteId(b.id)}
                                        aria-label="Delete message"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {tab === 'inbox' && (loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : contactMessages.length === 0 ? (
        <div className="py-20 text-center rounded-xl border border-border/60">
          <Inbox className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No messages received yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Messages sent through the public contact form will appear here.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 divide-y divide-border/60 overflow-hidden">
          {contactMessages.map((m) => {
            const isOpen = expandedId === m.id
            return (
              <div key={m.id} className={!m.is_read ? 'bg-primary/5' : ''}>
                <button
                  onClick={() => openContactMessage(m)}
                  className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors"
                >
                  <Mail className={`w-4 h-4 mt-0.5 shrink-0 ${!m.is_read ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm ${!m.is_read ? 'font-semibold' : 'font-medium'}`}>{m.subject}</span>
                      {!m.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      From <span className="font-medium text-foreground">{m.student?.full_name ?? m.name}</span>
                      {' '}&lt;{m.email}&gt;
                      {m.grade && (
                        <span className="inline-flex items-center gap-1 ml-2">
                          <GraduationCap className="w-3 h-3" style={{ color: m.grade.color }} />
                          <span style={{ color: m.grade.color }}>{m.grade.name}</span>
                        </span>
                      )}
                    </p>
                    {!isOpen && <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{m.body}</p>}
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0 whitespace-nowrap">
                    {new Date(m.created_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pl-11 space-y-2.5">
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">{m.body}</p>
                    {m.contact_message_replies.map((r) => (
                      <div
                        key={r.id}
                        className={`rounded-lg border p-3 ${r.sender_role === 'admin' ? 'border-primary/30 bg-primary/5' : 'border-border/60 bg-muted/20'}`}
                      >
                        <p className="text-xs text-muted-foreground mb-1">{r.sender_role === 'admin' ? 'You' : (m.student?.full_name ?? m.name)}</p>
                        <p className="text-sm whitespace-pre-wrap">{r.body}</p>
                      </div>
                    ))}
                    {m.student_id && (
                      <div className="flex items-end gap-2 pt-1">
                        <Textarea
                          value={replyDrafts[m.id] ?? ''}
                          onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                          placeholder="Reply in-app — the student sees this in their Messages page…"
                          className="text-sm min-h-[60px] resize-y"
                        />
                        <Button
                          size="sm"
                          className="bg-primary text-primary-foreground hover:bg-accent shrink-0"
                          disabled={sendingReplyId === m.id || !(replyDrafts[m.id] ?? '').trim()}
                          onClick={() => sendContactReply(m.id)}
                        >
                          {sendingReplyId === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                        <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`}>Reply by Email</a>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteContactId(m.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Message' : 'Send Message / Homework'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Grade *</Label>
                <Select value={gradeId} onValueChange={(v) => { setGradeId(v); setChapterId('') }}>
                  <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                  <SelectContent>
                    {grades.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Send to *</Label>
                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    <SelectItem value="live">Live Classes Only</SelectItem>
                    <SelectItem value="video">Video Packages Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Chapter (optional)</Label>
              <Select value={chapterId || 'none'} onValueChange={(v) => setChapterId(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="General (no chapter)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">General (no chapter)</SelectItem>
                  {chapters.map((ch) => (
                    <SelectItem key={ch.id} value={ch.id}>{ch.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Homework – Chapter 3 Exercises"
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Message *</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your homework instructions, links, or announcement here…"
                className="text-sm min-h-[120px] resize-y"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSend}
              disabled={saving || !title.trim() || !body.trim() || !gradeId}
              className="bg-primary text-primary-foreground hover:bg-accent"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editingId ? 'Save changes' : 'Send Message'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this message?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the message from all students&apos; inboxes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation — inbox message */}
      <AlertDialog open={!!deleteContactId} onOpenChange={(open) => { if (!open) setDeleteContactId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this message?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this message from the inbox.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteContactId && deleteContactMessage(deleteContactId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

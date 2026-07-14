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
import { Loader2, Plus, Trash2, Megaphone, Users, Radio, Video, FolderOpen } from 'lucide-react'
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

export default function AdminBroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [gradeId, setGradeId] = useState('')
  const [chapterId, setChapterId] = useState('')
  const [audience, setAudience] = useState('all')

  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: bData }, { data: gData }] = await Promise.all([
      (supabase as any)
        .from('broadcasts')
        .select('id, title, body, grade_id, chapter_id, target_audience, created_at, grade:grades(name, color), chapter:chapters(title)')
        .order('created_at', { ascending: false }),
      supabase.from('grades').select('id, name, color').eq('is_active', true).order('order_index'),
    ])
    setBroadcasts((bData ?? []) as Broadcast[])
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

  function openNew() {
    setTitle('')
    setBody('')
    setAudience('all')
    setChapterId('')
    if (grades.length > 0) setGradeId(grades[0].id)
    setDialogOpen(true)
  }

  async function handleSend() {
    if (!title.trim() || !body.trim() || !gradeId) return
    setSaving(true)
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Send homework, reminders, or announcements to students by grade
          </p>
        </div>
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-accent" onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" /> New Message
        </Button>
      </div>

      {loading ? (
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
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[620px]">
              <thead className="bg-muted/30 border-b border-border/60">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Grade</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Chapter</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Audience</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Sent</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {broadcasts.map((b) => {
                  const aud = AUDIENCE_LABELS[b.target_audience] ?? AUDIENCE_LABELS.all
                  const AudIcon = aud.icon
                  const grade = b.grade
                  return (
                    <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium line-clamp-1 max-w-[220px]">{b.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1 max-w-[220px] mt-0.5">{b.body}</p>
                      </td>
                      <td className="px-4 py-3">
                        {grade && (
                          <Badge
                            variant="outline"
                            style={{ borderColor: `${grade.color}40`, color: grade.color, backgroundColor: `${grade.color}10` }}
                          >
                            {grade.name}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {b.chapter ? (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <FolderOpen className="w-3 h-3" />
                            {b.chapter.title}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">General</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`gap-1 text-xs ${aud.className}`}>
                          <AudIcon className="w-3 h-3" />
                          {aud.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(b.created_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                          onClick={() => setDeleteId(b.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Message / Homework</DialogTitle>
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
              Send Message
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
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2, Package, Radio, Eye, EyeOff, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { PackageOption } from '@/components/lc/video-form'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

interface RevisionNote {
  id: string
  title: string
  content: string | null
  content_live: string | null
  grade_id: string
  chapter_id: string | null
  is_published: boolean
  is_published_for_live: boolean
}

interface Props {
  grades: { id: string; name: string; color: string }[]
  packages: PackageOption[]
  note?: RevisionNote
  initialGradeId?: string
  initialPackageId?: string
}

export function RevisionNotesForm({ grades, packages, note, initialGradeId = '', initialPackageId = '' }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isEditing = !!note

  const defaultGradeId = initialGradeId || note?.grade_id || grades[0]?.id || ''
  const [gradeId, setGradeId] = useState(defaultGradeId)
  const [chapterId, setChapterId] = useState(note?.chapter_id ?? '')
  const [title, setTitle] = useState(note?.title ?? '')
  const [content, setContent] = useState(note?.content ?? '')
  const [contentLive, setContentLive] = useState(note?.content_live ?? '')
  const [isPublished, setIsPublished] = useState(note?.is_published ?? false)
  const [isPublishedForLive, setIsPublishedForLive] = useState(note?.is_published_for_live ?? false)
  const [previewTab, setPreviewTab] = useState<'video' | 'live'>('video')

  const [videoPackageId, setVideoPackageId] = useState(() => {
    if (!note?.chapter_id) return initialPackageId && packages.find(p => p.id === initialPackageId && p.package_type !== 'live_month') ? initialPackageId : ''
    const match = packages.find(p => p.package_type !== 'live_month' && p.chapters.some(ch => ch.id === note.chapter_id))
    return match?.id ?? ''
  })
  const [livePackageId, setLivePackageId] = useState(() => {
    if (!note?.chapter_id) return initialPackageId && packages.find(p => p.id === initialPackageId && p.package_type === 'live_month') ? initialPackageId : ''
    const match = packages.find(p => p.package_type === 'live_month' && p.chapters.some(ch => ch.id === note.chapter_id))
    return match?.id ?? ''
  })

  const videoPackagesForGrade = packages.filter(p => p.grade_id === gradeId && p.package_type !== 'live_month')
  const livePackagesForGrade = packages.filter(p => p.grade_id === gradeId && p.package_type === 'live_month')

  // Chapters available for the currently selected video package
  const videoChapters = videoPackageId
    ? (packages.find(p => p.id === videoPackageId)?.chapters ?? [])
    : videoPackagesForGrade.flatMap(p => p.chapters)

  // Chapters available for the currently selected live package
  const liveChapters = livePackageId
    ? (packages.find(p => p.id === livePackageId)?.chapters ?? [])
    : livePackagesForGrade.flatMap(p => p.chapters)

  // Merge unique chapters
  const allChapterMap = new Map<string, { id: string; title: string }>()
  for (const ch of [...videoChapters, ...liveChapters]) {
    if (ch?.id) allChapterMap.set(ch.id, ch)
  }
  const availableChapters = Array.from(allChapterMap.values())

  useEffect(() => {
    if (chapterId && !availableChapters.some(c => c.id === chapterId)) {
      setChapterId('')
    }
  }, [gradeId, videoPackageId, livePackageId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { toast.error('Title is required'); return }
    if (!gradeId) { toast.error('Grade is required'); return }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const payload: Record<string, any> = {
      title: title.trim(),
      content: content || null,
      content_live: contentLive || null,
      grade_id: gradeId,
      chapter_id: chapterId || null,
      is_published: isPublished,
      is_published_for_live: isPublishedForLive,
    }

    let noteId = note?.id
    if (isEditing) {
      const { error } = await (supabase as any).from('revision_notes').update(payload).eq('id', note!.id)
      if (error) { toast.error(error.message); setLoading(false); return }
    } else {
      payload.created_by = user!.id
      const { data, error } = await (supabase as any).from('revision_notes').insert(payload).select('id').single()
      if (error) { toast.error(error.message); setLoading(false); return }
      noteId = data.id
    }

    // Sync subscription_package_chapters (same as video/doc pattern)
    if (chapterId && noteId) {
      const packageIds = [
        videoPackageId || null,
        livePackageId || null,
      ].filter(Boolean) as string[]

      for (const pkgId of packageIds) {
        const { data: existing } = await supabase
          .from('subscription_package_chapters')
          .select('id')
          .eq('package_id', pkgId)
          .eq('chapter_id', chapterId)
          .maybeSingle()

        if (!existing) {
          await (supabase as any).from('subscription_package_chapters').insert({ package_id: pkgId, chapter_id: chapterId })
        }
      }
    }

    toast.success(isEditing ? 'Revision notes updated' : 'Revision notes created')
    router.push('/admin/videos')
    router.refresh()
    setLoading(false)
  }

  async function handleDelete() {
    if (!note || !confirm(`Delete "${note.title}" permanently?`)) return
    setDeleting(true)
    const supabase = createClient()
    const { error } = await (supabase as any).from('revision_notes').delete().eq('id', note.id)
    if (error) { toast.error(error.message); setDeleting(false); return }
    toast.success('Revision notes deleted')
    router.push('/admin/videos')
    router.refresh()
  }

  function pkgLabel(p: PackageOption) {
    if (p.month && p.year) return `${MONTHS[p.month - 1]} ${p.year} — ${p.name}`
    return p.name
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">

      {/* Grade */}
      <div className="space-y-1.5">
        <Label>Grade *</Label>
        <Select value={gradeId} onValueChange={(v) => { setGradeId(v); setVideoPackageId(''); setLivePackageId(''); setChapterId('') }}>
          <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
          <SelectContent>
            {grades.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Package selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-primary" /> Video Package
          </Label>
          <Select value={videoPackageId || 'none'} onValueChange={(v) => { setVideoPackageId(v === 'none' ? '' : v); setChapterId('') }}>
            <SelectTrigger><SelectValue placeholder="Any / none" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Any / none</SelectItem>
              {videoPackagesForGrade.map(p => (
                <SelectItem key={p.id} value={p.id}>{pkgLabel(p)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-blue-500" /> Live Package
          </Label>
          <Select value={livePackageId || 'none'} onValueChange={(v) => { setLivePackageId(v === 'none' ? '' : v); setChapterId('') }}>
            <SelectTrigger><SelectValue placeholder="Any / none" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Any / none</SelectItem>
              {livePackagesForGrade.map(p => (
                <SelectItem key={p.id} value={p.id}>{pkgLabel(p)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chapter */}
      <div className="space-y-1.5">
        <Label>Chapter</Label>
        <Select value={chapterId || 'none'} onValueChange={(v) => setChapterId(v === 'none' ? '' : v)}>
          <SelectTrigger><SelectValue placeholder="No chapter" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No chapter</SelectItem>
            {availableChapters.map(ch => (
              <SelectItem key={ch.id} value={ch.id}>{ch.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label>Title *</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Chapter 3 — Key Formulas"
        />
      </div>

      {/* HTML content with tabs: edit / preview for each version */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Content</span>
        </div>

        {/* Video package content */}
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/5 border-b border-border/40">
            <Package className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm font-medium text-primary">Video Package Version</span>
          </div>
          <div className="p-4 space-y-3">
            <Tabs defaultValue="edit">
              <TabsList className="h-7 text-xs">
                <TabsTrigger value="edit" className="text-xs h-6 px-3">Edit HTML</TabsTrigger>
                <TabsTrigger value="preview" className="text-xs h-6 px-3">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="edit" className="mt-2">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="<h2>Topic</h2><p>Your revision notes here...</p>"
                  className="font-mono text-xs min-h-[200px] resize-y"
                />
              </TabsContent>
              <TabsContent value="preview" className="mt-2">
                <div
                  className="min-h-[200px] p-4 rounded-lg border border-border/60 bg-background prose prose-sm max-w-none dark:prose-invert overflow-auto"
                  dangerouslySetInnerHTML={{ __html: content || '<p class="text-muted-foreground">No content yet.</p>' }}
                />
              </TabsContent>
            </Tabs>
            <div className="flex items-center gap-3 pt-1">
              {isPublished ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
              <Label className="text-sm cursor-pointer" htmlFor="is_published">Published for Video Package</Label>
              <Switch
                id="is_published"
                checked={isPublished}
                onCheckedChange={setIsPublished}
                disabled={!content.trim()}
              />
            </div>
          </div>
        </div>

        {/* Live content */}
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/20 border-b border-border/40">
            <Radio className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Live Classes Version</span>
          </div>
          <div className="p-4 space-y-3">
            <Tabs defaultValue="edit">
              <TabsList className="h-7 text-xs">
                <TabsTrigger value="edit" className="text-xs h-6 px-3">Edit HTML</TabsTrigger>
                <TabsTrigger value="preview" className="text-xs h-6 px-3">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="edit" className="mt-2">
                <Textarea
                  value={contentLive}
                  onChange={(e) => setContentLive(e.target.value)}
                  placeholder="<h2>Topic</h2><p>Live class revision notes...</p>"
                  className="font-mono text-xs min-h-[200px] resize-y"
                />
              </TabsContent>
              <TabsContent value="preview" className="mt-2">
                <div
                  className="min-h-[200px] p-4 rounded-lg border border-border/60 bg-background prose prose-sm max-w-none dark:prose-invert overflow-auto"
                  dangerouslySetInnerHTML={{ __html: contentLive || '<p class="text-muted-foreground">No content yet.</p>' }}
                />
              </TabsContent>
            </Tabs>
            <div className="flex items-center gap-3 pt-1">
              {isPublishedForLive ? <Eye className="w-4 h-4 text-blue-500" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
              <Label className="text-sm cursor-pointer" htmlFor="is_published_live">Published for Live Classes</Label>
              <Switch
                id="is_published_live"
                checked={isPublishedForLive}
                onCheckedChange={setIsPublishedForLive}
                disabled={!contentLive.trim()}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-2">
          <Button type="submit" disabled={loading || deleting} className="bg-primary text-primary-foreground hover:bg-accent">
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {isEditing ? 'Save Changes' : 'Create Revision Notes'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading || deleting}>
            Cancel
          </Button>
        </div>
        {isEditing && (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
            disabled={deleting || loading}
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
            Delete
          </Button>
        )}
      </div>
    </form>
  )
}

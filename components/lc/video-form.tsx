'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Trash2, Package, Radio } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { Video } from '@/lib/types/database'

export function extractStreamableId(input: string): string | null {
  const srcMatch = input.match(/src=["']https?:\/\/streamable\.com\/e\/([a-z0-9]{2,})/i)
  if (srcMatch) return srcMatch[1]
  const urlMatch = input.match(/streamable\.com\/(?:e\/)?([a-z0-9]{2,})/i)
  return urlMatch ? urlMatch[1] : null
}

function normalizeStreamableUrl(input: string): string {
  const id = extractStreamableId(input)
  return id ? `https://streamable.com/e/${id}` : input
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  chapter_id: z.string().optional(),
  streamable_embed: z.string().min(1, 'Paste the Streamable embed or URL for video packages').refine(
    (v) => extractStreamableId(v) !== null,
    'No Streamable video found. Paste the full embed code or a streamable.com URL.'
  ),
  streamable_embed_live: z.string().optional().refine(
    (v) => !v || extractStreamableId(v) !== null,
    'No Streamable video found in the live URL.'
  ),
  thumbnail_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  duration_minutes: z.coerce.number().min(0).optional(),
  is_published: z.boolean(),
  is_published_for_live: z.boolean(),
  is_demo: z.boolean(),
})

type FormData = z.infer<typeof schema>

export interface PackageOption {
  id: string
  name: string
  grade_id: string
  month: number | null
  year: number | null
  package_type: 'video' | 'live_month' | null
  chapters: { id: string; title: string; order_index: number }[]
}

interface VideoFormProps {
  packages: PackageOption[]
  grades: { id: string; name: string; color: string }[]
  video?: Video & { streamable_url_live?: string | null; is_published_for_live?: boolean }
  initialPackageId?: string
  initialGradeId?: string
}

export function VideoForm({ packages, grades, video, initialPackageId = '', initialGradeId = '' }: VideoFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isEditing = !!video

  const defaultGradeId = initialGradeId || grades[0]?.id || ''
  const [gradeId, setGradeId] = useState(defaultGradeId)

  const [videoPackageId, setVideoPackageId] = useState(() => {
    if (!video?.chapter_id) return initialPackageId && packages.find(p => p.id === initialPackageId && p.package_type !== 'live_month') ? initialPackageId : ''
    const match = packages.find(p => p.package_type !== 'live_month' && p.chapters.some(ch => ch.id === video.chapter_id))
    return match?.id ?? ''
  })
  const [livePackageId, setLivePackageId] = useState(() => {
    if (!video?.chapter_id) return initialPackageId && packages.find(p => p.id === initialPackageId && p.package_type === 'live_month') ? initialPackageId : ''
    const match = packages.find(p => p.package_type === 'live_month' && p.chapters.some(ch => ch.id === video.chapter_id))
    return match?.id ?? ''
  })

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: video?.title ?? '',
      description: video?.description ?? '',
      chapter_id: video?.chapter_id ?? undefined,
      streamable_embed: video?.streamable_url ?? '',
      streamable_embed_live: video?.streamable_url_live ?? '',
      thumbnail_url: video?.thumbnail_url ?? '',
      duration_minutes: video?.duration_minutes ?? undefined,
      is_published: video?.is_published ?? true,
      is_published_for_live: video?.is_published_for_live ?? false,
      is_demo: video?.is_demo ?? false,
    },
  })

  const embedInput = watch('streamable_embed')
  const embedLiveInput = watch('streamable_embed_live')
  const streamableId = embedInput ? extractStreamableId(embedInput) : null
  const streamableIdLive = embedLiveInput ? extractStreamableId(embedLiveInput) : null

  const videoPackagesForGrade = packages.filter(p => p.grade_id === gradeId && p.package_type !== 'live_month')
  const livePackagesForGrade = packages.filter(p => p.grade_id === gradeId && p.package_type === 'live_month')

  const selectedVideoPackage = packages.find(p => p.id === videoPackageId)
  const selectedLivePackage = packages.find(p => p.id === livePackageId)

  const availableChapters = (() => {
    const chapterMap = new Map<string, { id: string; title: string; order_index: number }>()
    if (videoPackageId && selectedVideoPackage) {
      for (const ch of selectedVideoPackage.chapters) chapterMap.set(ch.id, ch)
    }
    if (livePackageId && selectedLivePackage) {
      for (const ch of selectedLivePackage.chapters) chapterMap.set(ch.id, ch)
    }
    if (!videoPackageId && !livePackageId) {
      for (const p of packages.filter(p => p.grade_id === gradeId)) {
        for (const ch of p.chapters) chapterMap.set(ch.id, ch)
      }
    }
    return Array.from(chapterMap.values()).sort((a, b) => a.order_index - b.order_index)
  })()

  const selectedChapterId = watch('chapter_id')

  useEffect(() => {
    const current = watch('chapter_id')
    if (current && !availableChapters.find(c => c.id === current)) {
      setValue('chapter_id', undefined)
    }
  }, [videoPackageId, livePackageId])

  async function onSubmit(data: FormData) {
    if (!videoPackageId && !livePackageId) {
      toast.error('Select at least one package (Video or Live Month)')
      return
    }
    setLoading(true)
    const supabase = createClient()

    const payload: Record<string, any> = {
      title: data.title,
      description: data.description || null,
      grade_id: gradeId,
      chapter_id: data.chapter_id || null,
      streamable_url: normalizeStreamableUrl(data.streamable_embed),
      streamable_url_live: data.streamable_embed_live ? normalizeStreamableUrl(data.streamable_embed_live) : null,
      thumbnail_url: data.thumbnail_url || null,
      price: 0,
      is_free: false,
      is_demo: data.is_demo,
      duration_minutes: data.duration_minutes || null,
      is_published: data.is_published,
      is_published_for_live: data.is_published_for_live,
    }

    if (isEditing) {
      const { error } = await supabase.from('videos').update(payload).eq('id', video.id)
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Video updated')
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('videos').insert({ ...payload, created_by: user!.id })
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Video added')
    }

    router.push('/admin/videos')
    router.refresh()
  }

  async function handleDelete() {
    if (!video || !confirm('Delete this video permanently?')) return
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('videos').delete().eq('id', video.id)
    if (error) { toast.error(error.message); setDeleting(false); return }
    toast.success('Video deleted')
    router.push('/admin/videos')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">

      {/* ── Streamable URLs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5">
            <Label className="text-sm font-semibold mb-1 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-primary" /> Video Package URL *
            </Label>
            <p className="text-xs text-muted-foreground mb-2">Streamable URL for video package subscribers.</p>
            <Textarea
              rows={3}
              placeholder="https://streamable.com/abc123"
              className="font-mono text-xs"
              {...register('streamable_embed')}
            />
            {errors.streamable_embed && (
              <p className="text-xs text-destructive mt-1">{errors.streamable_embed.message}</p>
            )}
            {streamableId && (
              <div className="mt-2 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                <span className="font-medium">✓ Detected:</span>
                <code>{streamableId}</code>
                <a href={`https://streamable.com/${streamableId}`} target="_blank" rel="noopener noreferrer" className="hover:underline shrink-0">Verify ↗</a>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-5">
            <Label className="text-sm font-semibold mb-1 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-primary" /> Live Classes URL
            </Label>
            <p className="text-xs text-muted-foreground mb-2">Separate Streamable URL for live class subscribers (optional — can be added later).</p>
            <Textarea
              rows={3}
              placeholder="https://streamable.com/xyz789"
              className="font-mono text-xs"
              {...register('streamable_embed_live')}
            />
            {errors.streamable_embed_live && (
              <p className="text-xs text-destructive mt-1">{errors.streamable_embed_live.message}</p>
            )}
            {streamableIdLive && (
              <div className="mt-2 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                <span className="font-medium">✓ Detected:</span>
                <code>{streamableIdLive}</code>
                <a href={`https://streamable.com/${streamableIdLive}`} target="_blank" rel="noopener noreferrer" className="hover:underline shrink-0">Verify ↗</a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Basic info ── */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input id="title" placeholder="e.g. Introduction to Algebra" {...register('title')} />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" placeholder="What will students learn?" rows={3} {...register('description')} />
        </div>

        {/* Grade */}
        <div className="space-y-2">
          <Label>Grade *</Label>
          <Select
            value={gradeId}
            onValueChange={(v) => {
              setGradeId(v)
              setVideoPackageId('')
              setLivePackageId('')
              setValue('chapter_id', undefined)
            }}
          >
            <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
            <SelectContent>
              {grades.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Package selection — side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-primary" /> Video Package
            </Label>
            <Select
              value={videoPackageId || '__none__'}
              onValueChange={(v) => {
                setVideoPackageId(v === '__none__' ? '' : v)
              }}
              disabled={!gradeId || videoPackagesForGrade.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !gradeId ? 'Select grade first' :
                  videoPackagesForGrade.length === 0 ? 'No video packages' :
                  'Select video package'
                } />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {videoPackagesForGrade.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-primary" /> Live Month Package
            </Label>
            <Select
              value={livePackageId || '__none__'}
              onValueChange={(v) => {
                setLivePackageId(v === '__none__' ? '' : v)
              }}
              disabled={!gradeId || livePackagesForGrade.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !gradeId ? 'Select grade first' :
                  livePackagesForGrade.length === 0 ? 'No live packages' :
                  'Select live package'
                } />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {livePackagesForGrade.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}{p.month && p.year ? ` — ${MONTHS[p.month - 1]} ${p.year}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Chapter */}
        <div className="space-y-2">
          <Label>Chapter</Label>
          <Select
            value={selectedChapterId ?? '__none__'}
            onValueChange={(v) => setValue('chapter_id', v === '__none__' ? undefined : v)}
            disabled={availableChapters.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={
                availableChapters.length === 0 ? 'Select a package first' : 'Optional — select chapter'
              } />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No chapter</SelectItem>
              {availableChapters.map((ch) => (
                <SelectItem key={ch.id} value={ch.id}>{ch.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="duration_minutes">Duration (minutes)</Label>
            <Input id="duration_minutes" type="number" min="0" placeholder="e.g. 45" {...register('duration_minutes')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="thumbnail_url">Thumbnail URL (optional)</Label>
            <Input id="thumbnail_url" type="url" placeholder="https://…" {...register('thumbnail_url')} />
          </div>
        </div>
      </div>

      {/* ── Publish ── */}
      <Card className="border-border/60">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-primary" /> Published for Video Packages
              </Label>
              <p className="text-xs text-muted-foreground">Visible to video package subscribers</p>
            </div>
            <Switch checked={watch('is_published')} onCheckedChange={(v) => setValue('is_published', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-primary" /> Published for Live Classes
              </Label>
              <p className="text-xs text-muted-foreground">Visible to live class subscribers (uses Live Classes URL)</p>
            </div>
            <Switch checked={watch('is_published_for_live')} onCheckedChange={(v) => setValue('is_published_for_live', v)} />
          </div>
          <div className="flex items-center justify-between border-t border-border/40 pt-4">
            <div>
              <Label>Demo video</Label>
              <p className="text-xs text-muted-foreground">Freely watchable without subscription</p>
            </div>
            <Switch checked={watch('is_demo')} onCheckedChange={(v) => setValue('is_demo', v)} />
          </div>
        </CardContent>
      </Card>

      {/* ── Actions ── */}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground hover:bg-accent">
          {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {isEditing ? 'Save Changes' : 'Add Video'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        {isEditing && (
          <Button type="button" variant="outline"
            className="ml-auto text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={handleDelete} disabled={deleting}
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-1" />}
            Delete
          </Button>
        )}
      </div>
    </form>
  )
}

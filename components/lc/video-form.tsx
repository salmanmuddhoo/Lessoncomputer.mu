'use client'

import { useEffect } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Trash2 } from 'lucide-react'
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

/**
 * Extracts the Streamable video ID from:
 *  - Full embed HTML: <iframe src="https://streamable.com/e/abc123"...
 *  - Direct URL:  https://streamable.com/abc123
 *  - Embed URL:   https://streamable.com/e/abc123
 */
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
  package_id: z.string().min(1, 'Please select a subscription package'),
  chapter_id: z.string().optional(),
  streamable_embed: z.string().min(1, 'Please paste the Streamable embed code or URL').refine(
    (v) => extractStreamableId(v) !== null,
    'No Streamable video found. Paste the full embed code or a streamable.com URL.'
  ),
  thumbnail_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  duration_minutes: z.coerce.number().min(0).optional(),
  is_published: z.boolean(),
  is_demo: z.boolean(),
})

type FormData = z.infer<typeof schema>

export interface PackageOption {
  id: string
  name: string
  grade_id: string
  month: number
  year: number
  chapters: { id: string; title: string; order_index: number }[]
}

interface VideoFormProps {
  packages: PackageOption[]
  video?: Video
  initialPackageId?: string
}

export function VideoForm({ packages, video, initialPackageId = '' }: VideoFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isEditing = !!video

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: video?.title ?? '',
      description: video?.description ?? '',
      package_id: initialPackageId,
      chapter_id: video?.chapter_id ?? undefined,
      streamable_embed: video?.streamable_url ?? '',
      thumbnail_url: video?.thumbnail_url ?? '',
      duration_minutes: video?.duration_minutes ?? undefined,
      is_published: video?.is_published ?? false,
      is_demo: video?.is_demo ?? false,
    },
  })

  const embedInput = watch('streamable_embed')
  const selectedPackageId = watch('package_id')
  const streamableId = embedInput ? extractStreamableId(embedInput) : null

  const selectedPackage = packages.find((p) => p.id === selectedPackageId)
  const chaptersForPackage = selectedPackage
    ? [...selectedPackage.chapters].sort((a, b) => a.order_index - b.order_index)
    : []

  useEffect(() => {
    const currentChapter = watch('chapter_id')
    if (currentChapter && !chaptersForPackage.find((c) => c.id === currentChapter)) {
      setValue('chapter_id', undefined)
    }
  }, [selectedPackageId])

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()

    const pkg = packages.find((p) => p.id === data.package_id)
    const payload = {
      title: data.title,
      description: data.description || null,
      grade_id: pkg?.grade_id ?? '',
      chapter_id: data.chapter_id || null,
      streamable_url: normalizeStreamableUrl(data.streamable_embed),
      thumbnail_url: data.thumbnail_url || null,
      price: 0,
      is_free: false,
      is_demo: data.is_demo,
      duration_minutes: data.duration_minutes || null,
      is_published: data.is_published,
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

      {/* ── Streamable embed ── */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-5">
          <Label className="text-base font-semibold mb-1 block">
            Streamable Embed Code or URL *
          </Label>
          <p className="text-xs text-muted-foreground mb-3">
            Paste the full embed code from Streamable (or just the video URL).
          </p>
          <Textarea
            rows={4}
            placeholder={`Paste embed code:\n<div style="..."><iframe src="https://streamable.com/e/abc123"...></iframe></div>\n\nOr just the URL:\nhttps://streamable.com/abc123`}
            className="font-mono text-xs"
            {...register('streamable_embed')}
          />
          {errors.streamable_embed && (
            <p className="text-xs text-destructive mt-1">{errors.streamable_embed.message}</p>
          )}

          {streamableId && (
            <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-green-700 dark:text-green-400">Video detected</p>
                <code className="text-xs text-muted-foreground">{streamableId}</code>
              </div>
              <a
                href={`https://streamable.com/${streamableId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline shrink-0"
              >
                Verify on Streamable ↗
              </a>
            </div>
          )}
        </CardContent>
      </Card>

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

        {/* Package + Chapter row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Subscription Package *</Label>
            <Select
              defaultValue={initialPackageId || undefined}
              onValueChange={(v) => setValue('package_id', v)}
            >
              <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
              <SelectContent>
                {packages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {MONTHS[p.month - 1]} {p.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.package_id && (
              <p className="text-xs text-destructive">{errors.package_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Chapter</Label>
            <Select
              value={watch('chapter_id') ?? '__none__'}
              onValueChange={(v) => setValue('chapter_id', v === '__none__' ? undefined : v)}
              disabled={!selectedPackageId || chaptersForPackage.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !selectedPackageId ? 'Select a package first' :
                  chaptersForPackage.length === 0 ? 'No chapters in this package' :
                  'Optional — select chapter'
                } />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No chapter</SelectItem>
                {chaptersForPackage.map((ch) => (
                  <SelectItem key={ch.id} value={ch.id}>{ch.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
              <Label>Published</Label>
              <p className="text-xs text-muted-foreground">Make this video visible to students</p>
            </div>
            <Switch checked={watch('is_published')} onCheckedChange={(v) => setValue('is_published', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Demo video</Label>
              <p className="text-xs text-muted-foreground">Freely watchable without login or subscription</p>
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

'use client'

import { useState, useEffect } from 'react'
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
import type { Video, Chapter } from '@/lib/types/database'

/**
 * Extracts the Streamable video ID from:
 *  - Full embed HTML: <div>...<iframe src="https://streamable.com/e/abc123?"...
 *  - Direct URL:  https://streamable.com/abc123
 *  - Embed URL:   https://streamable.com/e/abc123
 */
export function extractStreamableId(input: string): string | null {
  // Try src attribute in embed HTML first
  const srcMatch = input.match(/src=["']https?:\/\/streamable\.com\/e\/([a-z0-9]+)/i)
  if (srcMatch) return srcMatch[1]
  // Try plain URL (with or without /e/ prefix)
  const urlMatch = input.match(/streamable\.com\/(?:e\/)?([a-z0-9]+)/i)
  return urlMatch ? urlMatch[1] : null
}

function normalizeStreamableUrl(input: string): string {
  const id = extractStreamableId(input)
  return id ? `https://streamable.com/e/${id}` : input
}

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  grade_id: z.string().min(1, 'Please select a grade'),
  chapter_id: z.string().optional(),
  streamable_embed: z.string().min(1, 'Please paste the Streamable embed code or URL').refine(
    (v) => extractStreamableId(v) !== null,
    'No Streamable video found. Paste the full embed code or a streamable.com URL.'
  ),
  thumbnail_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  price: z.coerce.number().min(0),
  is_free: z.boolean(),
  duration_minutes: z.coerce.number().min(0).optional(),
  is_published: z.boolean(),
})

type FormData = z.infer<typeof schema>

interface VideoFormProps {
  grades: { id: string; name: string; color: string }[]
  video?: Video
}

export function VideoForm({ grades, video }: VideoFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loadingChapters, setLoadingChapters] = useState(false)
  const isEditing = !!video

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: video?.title ?? '',
      description: video?.description ?? '',
      grade_id: video?.grade_id ?? '',
      chapter_id: video?.chapter_id ?? undefined,
      streamable_embed: video?.streamable_url ?? '',
      thumbnail_url: video?.thumbnail_url ?? '',
      price: video?.price ?? 0,
      is_free: video?.is_free ?? true,
      duration_minutes: video?.duration_minutes ?? undefined,
      is_published: video?.is_published ?? false,
    },
  })

  const isFree = watch('is_free')
  const embedInput = watch('streamable_embed')
  const selectedGradeId = watch('grade_id')
  const streamableId = embedInput ? extractStreamableId(embedInput) : null

  // Load chapters whenever selected grade changes
  useEffect(() => {
    if (!selectedGradeId) { setChapters([]); return }
    setLoadingChapters(true)
    const supabase = createClient()
    supabase
      .from('chapters')
      .select('*')
      .eq('grade_id', selectedGradeId)
      .order('order_index')
      .then(({ data }) => {
        setChapters(data ?? [])
        setLoadingChapters(false)
        const currentChapterId = watch('chapter_id')
        if (currentChapterId && !(data ?? []).find((c) => c.id === currentChapterId)) {
          setValue('chapter_id', undefined)
        }
      })
  }, [selectedGradeId])

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()

    const payload = {
      title: data.title,
      description: data.description || null,
      grade_id: data.grade_id,
      chapter_id: data.chapter_id || null,
      streamable_url: normalizeStreamableUrl(data.streamable_embed),
      thumbnail_url: data.thumbnail_url || null,
      price: data.is_free ? 0 : data.price,
      is_free: data.is_free,
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
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-muted-foreground">Detected ID:</span>
                <code className="text-xs bg-muted px-2 py-0.5 rounded">{streamableId}</code>
              </div>
              <p className="text-xs text-muted-foreground mb-2">Preview:</p>
              <div className="aspect-video rounded-lg overflow-hidden border border-border/60">
                <iframe
                  src={`https://streamable.com/e/${streamableId}`}
                  frameBorder="0"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
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

        {/* Grade + Chapter row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Grade *</Label>
            <Select defaultValue={video?.grade_id} onValueChange={(v) => setValue('grade_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
              <SelectContent>
                {grades.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.grade_id && <p className="text-xs text-destructive">{errors.grade_id.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Chapter</Label>
            <Select
              value={watch('chapter_id') ?? '__none__'}
              onValueChange={(v) => setValue('chapter_id', v === '__none__' ? undefined : v)}
              disabled={!selectedGradeId || loadingChapters}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !selectedGradeId ? 'Select a grade first' :
                  loadingChapters ? 'Loading…' :
                  chapters.length === 0 ? 'No chapters yet' :
                  'Optional — select chapter'
                } />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No chapter</SelectItem>
                {chapters.map((ch) => (
                  <SelectItem key={ch.id} value={ch.id}>{ch.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedGradeId && chapters.length === 0 && !loadingChapters && (
              <p className="text-xs text-muted-foreground">
                No chapters yet.{' '}
                <a href={`/admin/grades/${selectedGradeId}/chapters`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Add chapters
                </a>
              </p>
            )}
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

      {/* ── Pricing ── */}
      <Card className="border-border/60">
        <CardContent className="p-5 space-y-4">
          <h3 className="font-semibold">Pricing</h3>
          <div className="flex items-center justify-between">
            <div>
              <Label>Free video</Label>
              <p className="text-xs text-muted-foreground">Students can watch without purchasing</p>
            </div>
            <Switch checked={isFree} onCheckedChange={(v) => setValue('is_free', v)} />
          </div>
          {!isFree && (
            <div className="space-y-2">
              <Label htmlFor="price">Price (Rs)</Label>
              <Input id="price" type="number" min="0" step="0.01" placeholder="e.g. 150" {...register('price')} />
              {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Publish ── */}
      <Card className="border-border/60">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <Label>Published</Label>
              <p className="text-xs text-muted-foreground">Make this video visible to students</p>
            </div>
            <Switch checked={watch('is_published')} onCheckedChange={(v) => setValue('is_published', v)} />
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

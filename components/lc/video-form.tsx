'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ExternalLink, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { Video } from '@/lib/types/database'

function extractStreamableId(url: string): string | null {
  const match = url.match(/streamable\.com\/([a-z0-9]+)/i)
  return match ? match[1] : null
}

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  grade_id: z.string().min(1, 'Please select a grade'),
  streamable_url: z.string().url('Please enter a valid URL').refine(
    (url) => extractStreamableId(url) !== null,
    'Must be a valid Streamable URL (e.g. https://streamable.com/abc123)'
  ),
  thumbnail_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  price: z.coerce.number().min(0, 'Price must be 0 or more'),
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
  const isEditing = !!video

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: video?.title ?? '',
      description: video?.description ?? '',
      grade_id: video?.grade_id ?? '',
      streamable_url: video?.streamable_url ?? '',
      thumbnail_url: video?.thumbnail_url ?? '',
      price: video?.price ?? 0,
      is_free: video?.is_free ?? true,
      duration_minutes: video?.duration_minutes ?? undefined,
      is_published: video?.is_published ?? false,
    },
  })

  const isFree = watch('is_free')
  const streamableUrl = watch('streamable_url')
  const streamableId = streamableUrl ? extractStreamableId(streamableUrl) : null

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()

    const payload = {
      title: data.title,
      description: data.description || null,
      grade_id: data.grade_id,
      streamable_url: data.streamable_url,
      thumbnail_url: data.thumbnail_url || null,
      price: data.is_free ? 0 : data.price,
      is_free: data.is_free,
      duration_minutes: data.duration_minutes || null,
      is_published: data.is_published,
    }

    if (isEditing) {
      const { error } = await supabase.from('videos').update(payload).eq('id', video.id)
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Video updated successfully')
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('videos').insert({ ...payload, created_by: user!.id })
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Video added successfully')
    }

    router.push('/admin/videos')
    router.refresh()
  }

  async function handleDelete() {
    if (!video || !confirm('Delete this video permanently? This cannot be undone.')) return
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
      {/* Streamable URL — first and most important */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-5">
          <Label htmlFor="streamable_url" className="text-base font-semibold mb-3 block">
            Streamable Video URL *
          </Label>
          <Input
            id="streamable_url"
            type="url"
            placeholder="https://streamable.com/abc123"
            {...register('streamable_url')}
          />
          {errors.streamable_url && (
            <p className="text-xs text-destructive mt-1">{errors.streamable_url.message}</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Paste the Streamable video page URL. The video will be embedded automatically.
          </p>

          {/* Live preview */}
          {streamableId && (
            <div className="mt-4">
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

      {/* Basic info */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input id="title" placeholder="e.g. Introduction to Algebra" {...register('title')} />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="What will students learn in this video?"
            rows={3}
            {...register('description')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Grade *</Label>
            <Select
              defaultValue={video?.grade_id}
              onValueChange={(v) => setValue('grade_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                {grades.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.grade_id && <p className="text-xs text-destructive">{errors.grade_id.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration_minutes">Duration (minutes)</Label>
            <Input
              id="duration_minutes"
              type="number"
              min="0"
              placeholder="e.g. 45"
              {...register('duration_minutes')}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="thumbnail_url">Thumbnail URL (optional)</Label>
          <Input
            id="thumbnail_url"
            type="url"
            placeholder="https://example.com/thumbnail.jpg"
            {...register('thumbnail_url')}
          />
        </div>
      </div>

      {/* Pricing */}
      <Card className="border-border/60">
        <CardContent className="p-5 space-y-4">
          <h3 className="font-semibold">Pricing</h3>

          <div className="flex items-center justify-between">
            <div>
              <Label>Free video</Label>
              <p className="text-xs text-muted-foreground">Students can watch without purchasing</p>
            </div>
            <Switch
              checked={isFree}
              onCheckedChange={(v) => setValue('is_free', v)}
            />
          </div>

          {!isFree && (
            <div className="space-y-2">
              <Label htmlFor="price">Price (Rs)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 150"
                {...register('price')}
              />
              {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Publish */}
      <Card className="border-border/60">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <Label>Published</Label>
              <p className="text-xs text-muted-foreground">Make this video visible to students</p>
            </div>
            <Switch
              checked={watch('is_published')}
              onCheckedChange={(v) => setValue('is_published', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={loading}
          className="bg-primary text-primary-foreground hover:bg-accent"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {isEditing ? 'Save Changes' : 'Add Video'}
        </Button>

        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>

        {isEditing && (
          <Button
            type="button"
            variant="outline"
            className="ml-auto text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-1" />}
            Delete
          </Button>
        )}
      </div>
    </form>
  )
}

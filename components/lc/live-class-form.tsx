'use client'

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { LiveClass } from '@/lib/types/database'

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  grade_id: z.string().min(1, 'Please select a grade'),
  scheduled_at: z.string().min(1, 'Please set a date and time'),
  meet_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  streamable_replay_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  price: z.coerce.number().min(0, 'Price must be 0 or more'),
  is_subscription_only: z.boolean(),
  max_students: z.coerce.number().min(0).optional(),
  is_published: z.boolean(),
})

type FormData = z.infer<typeof schema>

interface LiveClassFormProps {
  grades: { id: string; name: string; color: string }[]
  liveClass?: LiveClass
}

export function LiveClassForm({ grades, liveClass }: LiveClassFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isEditing = !!liveClass

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: liveClass?.title ?? '',
      description: liveClass?.description ?? '',
      grade_id: liveClass?.grade_id ?? '',
      scheduled_at: liveClass?.scheduled_at ? new Date(liveClass.scheduled_at).toISOString().slice(0, 16) : '',
      meet_url: liveClass?.meet_url ?? '',
      streamable_replay_url: liveClass?.streamable_replay_url ?? '',
      price: liveClass?.price ?? 0,
      is_subscription_only: liveClass?.is_subscription_only ?? false,
      max_students: liveClass?.max_students ?? undefined,
      is_published: liveClass?.is_published ?? false,
    },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()

    const payload = {
      title: data.title,
      description: data.description || null,
      grade_id: data.grade_id,
      scheduled_at: new Date(data.scheduled_at).toISOString(),
      meet_url: data.meet_url || null,
      streamable_replay_url: data.streamable_replay_url || null,
      price: data.price,
      is_subscription_only: data.is_subscription_only,
      max_students: data.max_students || null,
      is_published: data.is_published,
    }

    if (isEditing) {
      const { error } = await supabase.from('live_classes').update(payload).eq('id', liveClass.id)
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Live class updated')
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('live_classes').insert({ ...payload, created_by: user!.id })
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Live class scheduled')
    }

    router.push('/admin/live-classes')
    router.refresh()
  }

  async function handleDelete() {
    if (!liveClass || !confirm('Delete this live class permanently?')) return
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('live_classes').delete().eq('id', liveClass.id)
    if (error) { toast.error(error.message); setDeleting(false); return }
    toast.success('Live class deleted')
    router.push('/admin/live-classes')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input id="title" placeholder="e.g. Live Maths — Quadratic Equations" {...register('title')} />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" placeholder="What will be covered in this class?" rows={3} {...register('description')} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Grade *</Label>
            <Select defaultValue={liveClass?.grade_id} onValueChange={(v) => setValue('grade_id', v)}>
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
            <Label htmlFor="scheduled_at">Date & Time *</Label>
            <Input id="scheduled_at" type="datetime-local" {...register('scheduled_at')} />
            {errors.scheduled_at && <p className="text-xs text-destructive">{errors.scheduled_at.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="meet_url">Meeting URL (Google Meet / Zoom / etc.)</Label>
          <Input id="meet_url" type="url" placeholder="https://meet.google.com/..." {...register('meet_url')} />
          {errors.meet_url && <p className="text-xs text-destructive">{errors.meet_url.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="streamable_replay_url">Replay URL (Streamable — optional)</Label>
          <Input id="streamable_replay_url" type="url" placeholder="https://streamable.com/..." {...register('streamable_replay_url')} />
          <p className="text-xs text-muted-foreground">Add after the session ends so students can rewatch.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="price">Price (Rs)</Label>
            <Input id="price" type="number" min="0" placeholder="0 for free" {...register('price')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_students">Max students (optional)</Label>
            <Input id="max_students" type="number" min="0" placeholder="Unlimited" {...register('max_students')} />
          </div>
        </div>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Subscription only</Label>
              <p className="text-xs text-muted-foreground">Only allow subscribers to join</p>
            </div>
            <Switch checked={watch('is_subscription_only')} onCheckedChange={(v) => setValue('is_subscription_only', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Published</Label>
              <p className="text-xs text-muted-foreground">Make visible to students</p>
            </div>
            <Switch checked={watch('is_published')} onCheckedChange={(v) => setValue('is_published', v)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground hover:bg-accent">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {isEditing ? 'Save Changes' : 'Schedule Class'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        {isEditing && (
          <Button
            type="button" variant="outline"
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

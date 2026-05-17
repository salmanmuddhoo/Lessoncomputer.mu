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

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

const currentYear = new Date().getFullYear()
const YEARS = [currentYear - 1, currentYear, currentYear + 1]

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  grade_id: z.string().min(1, 'Please select a grade'),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2024).max(2030),
  class_time: z.string().min(1, 'Please set a start time'),
  meet_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  is_recurring: z.boolean(),
  recurrence_day_of_week: z.coerce.number().min(0).max(6).optional(),
  end_time: z.string().optional(),
  is_published: z.boolean(),
})

type FormData = z.infer<typeof schema>

interface LiveClassFormProps {
  grades: { id: string; name: string; color: string }[]
  liveClass?: LiveClass
}

function parseLocalMonth(isoString: string): number {
  return new Date(isoString).getMonth() + 1
}
function parseLocalYear(isoString: string): number {
  return new Date(isoString).getFullYear()
}
function parseLocalTime(isoString: string): string {
  const d = new Date(isoString)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
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
      month: liveClass?.scheduled_at ? parseLocalMonth(liveClass.scheduled_at) : new Date().getMonth() + 1,
      year: liveClass?.scheduled_at ? parseLocalYear(liveClass.scheduled_at) : currentYear,
      class_time: liveClass?.scheduled_at ? parseLocalTime(liveClass.scheduled_at) : '17:00',
      meet_url: liveClass?.meet_url ?? '',
      is_recurring: liveClass?.is_recurring ?? true,
      recurrence_day_of_week: liveClass?.recurrence_day_of_week ?? undefined,
      end_time: liveClass?.end_time?.slice(0, 5) ?? '',
      is_published: liveClass?.is_published ?? false,
    },
  })

  const isRecurring = watch('is_recurring')

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()

    const [hours, minutes] = data.class_time.split(':').map(Number)
    const scheduled_at = new Date(data.year, data.month - 1, 1, hours, minutes).toISOString()

    const payload = {
      title: data.title,
      description: data.description || null,
      grade_id: data.grade_id,
      package_id: null,
      scheduled_at,
      meet_url: data.meet_url || null,
      streamable_replay_url: null,
      price: 0,
      is_subscription_only: true,
      max_students: null,
      is_recurring: data.is_recurring,
      recurrence_day_of_week: data.is_recurring ? (data.recurrence_day_of_week ?? null) : null,
      end_time: data.is_recurring && data.end_time ? data.end_time : null,
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

        <div className="space-y-2">
          <Label>Grade *</Label>
          <Select
            defaultValue={liveClass?.grade_id}
            onValueChange={(v) => setValue('grade_id', v)}
          >
            <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
            <SelectContent>
              {grades.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.grade_id && <p className="text-xs text-destructive">{errors.grade_id.message}</p>}
        </div>

        {/* Month / Year / Time */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Month *</Label>
            <Select
              value={String(watch('month'))}
              onValueChange={(v) => setValue('month', Number(v))}
            >
              <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.month && <p className="text-xs text-destructive">{errors.month.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Year *</Label>
            <Select
              value={String(watch('year'))}
              onValueChange={(v) => setValue('year', Number(v))}
            >
              <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="class_time">Start time *</Label>
            <Input id="class_time" type="time" {...register('class_time')} />
            {errors.class_time && <p className="text-xs text-destructive">{errors.class_time.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="meet_url">Meeting URL (Google Meet / Zoom / etc.)</Label>
          <Input id="meet_url" type="url" placeholder="https://meet.google.com/..." {...register('meet_url')} />
          {errors.meet_url && <p className="text-xs text-destructive">{errors.meet_url.message}</p>}
        </div>
      </div>

      {/* Recurring toggle */}
      <Card className="border-border/60">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Recurring class</Label>
              <p className="text-xs text-muted-foreground">Repeats on the same day each week within this month</p>
            </div>
            <Switch checked={isRecurring} onCheckedChange={(v) => setValue('is_recurring', v)} />
          </div>

          {isRecurring && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Day of week *</Label>
                <Select
                  value={watch('recurrence_day_of_week') !== undefined ? String(watch('recurrence_day_of_week')) : ''}
                  onValueChange={(v) => setValue('recurrence_day_of_week', parseInt(v))}
                >
                  <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d, i) => (
                      <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End time</Label>
                <Input id="end_time" type="time" {...register('end_time')} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="p-5">
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

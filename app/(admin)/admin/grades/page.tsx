'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Plus, Pencil, Trash2, Check, X, BookOpen, Calendar } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { Grade } from '@/lib/types/database'

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  slug: z.string().min(2, 'Slug required').regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
  description: z.string().optional(),
  color: z.string().min(4, 'Color required'),
  image_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  order_index: z.coerce.number().min(0),
  is_active: z.boolean(),
  is_mauritius_only: z.boolean(),
  live_subscription_price: z.coerce.number().min(0),
  live_subscription_enabled: z.boolean(),
})

type FormData = z.infer<typeof schema>

function toSlug(name: string) {
  return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function GradeDialog({ grade, onDone }: { grade?: Grade; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: grade?.name ?? '',
      slug: grade?.slug ?? '',
      description: grade?.description ?? '',
      color: grade?.color ?? '#FACC15',
      image_url: grade?.image_url ?? '',
      order_index: grade?.order_index ?? 0,
      is_active: grade?.is_active ?? true,
      is_mauritius_only: (grade as any)?.is_mauritius_only ?? true,
      live_subscription_price: (grade as any)?.live_subscription_price ?? 0,
      live_subscription_enabled: (grade as any)?.live_subscription_enabled ?? false,
    },
  })

  const watchedName = watch('name')
  useEffect(() => {
    if (!grade && !slugTouched && watchedName) {
      setValue('slug', toSlug(watchedName))
    }
  }, [watchedName, grade, slugTouched, setValue])

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()

    if (grade) {
      const { error } = await supabase.from('grades').update(data).eq('id', grade.id)
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Grade updated')
    } else {
      const { error } = await supabase.from('grades').insert(data)
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Grade created')
    }

    setOpen(false)
    onDone()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {grade ? (
          <Button variant="ghost" size="sm"><Pencil className="w-3.5 h-3.5 mr-1" /> Edit</Button>
        ) : (
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-accent">
            <Plus className="w-4 h-4 mr-1" /> Add Grade
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{grade ? 'Edit Grade' : 'Add Grade'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input placeholder="Grade 7" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Slug *</Label>
              <Input
                placeholder="grade-7"
                {...register('slug')}
                onChange={(e) => { setSlugTouched(true); register('slug').onChange(e) }}
              />
              {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea placeholder="Short description..." rows={2} {...register('description')} />
          </div>
          <div className="space-y-2">
            <Label>Grade Card Image URL</Label>
            <Input placeholder="https://example.com/image.jpg" {...register('image_url')} />
            {errors.image_url && <p className="text-xs text-destructive">{errors.image_url.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 items-center">
                <input type="color" {...register('color')} className="w-10 h-10 rounded border border-border cursor-pointer bg-transparent" />
                <Input placeholder="#FACC15" {...register('color')} className="flex-1" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Order</Label>
              <Input type="number" min="0" {...register('order_index')} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch checked={watch('is_active')} onCheckedChange={(v) => setValue('is_active', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Mauritius Only</Label>
              <p className="text-xs text-muted-foreground">Show as Mauritius-only on the homepage grade card</p>
            </div>
            <Switch checked={watch('is_mauritius_only')} onCheckedChange={(v) => setValue('is_mauritius_only', v)} />
          </div>

          <div className="pt-2">
            <p className="text-sm font-semibold mb-3">Live Class Subscription</p>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Live Subscription Price (Rs)</Label>
                <Input type="number" min="0" step="0.01" placeholder="0" {...register('live_subscription_price')} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Live Subscription Enabled</Label>
                <Switch
                  checked={watch('live_subscription_enabled')}
                  onCheckedChange={(v) => setValue('live_subscription_enabled', v)}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1 bg-primary text-primary-foreground hover:bg-accent">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {grade ? 'Save' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function AdminGradesPage() {
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('grades').select('*').order('order_index')
    setGrades(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function deleteGrade(id: string) {
    if (!confirm('Delete this grade? All associated videos and classes will be affected.')) return
    const supabase = createClient()
    const { error } = await supabase.from('grades').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Grade deleted')
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Grades</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage grade levels and their organisation.</p>
        </div>
        <GradeDialog onDone={load} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-xl border border-border/60 overflow-hidden">
          {grades.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border/60">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Grade</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Slug</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {grades.map((g) => (
                  <tr key={g.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                        <span className="font-medium">{g.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{g.slug}</td>
                    <td className="px-4 py-3 text-muted-foreground">{g.order_index}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${g.is_active ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                        {g.is_active ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {g.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/grades/${g.id}/chapters`}>
                            <BookOpen className="w-3.5 h-3.5 mr-1" /> Chapters
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/grades/${g.id}/timetable`}>
                            <Calendar className="w-3.5 h-3.5 mr-1" /> Timetable
                          </Link>
                        </Button>
                        <GradeDialog grade={g} onDone={load} />
                        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => deleteGrade(g.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-16 text-center">
              <p className="text-muted-foreground mb-4">No grades configured yet.</p>
              <GradeDialog onDone={load} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Plus, Pencil, Trash2, ArrowLeft, Calendar } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { Grade } from '@/lib/types/database'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

interface TimetableEntry {
  id: string
  grade_id: string
  day_of_week: number
  subject: string
  start_time: string
  end_time: string
  teacher: string | null
  notes: string | null
  order_index: number
}

const schema = z.object({
  day_of_week: z.coerce.number().min(0).max(6),
  subject: z.string().min(1, 'Subject required'),
  start_time: z.string().min(1, 'Start time required'),
  end_time: z.string().min(1, 'End time required'),
  teacher: z.string().optional(),
  notes: z.string().optional(),
  order_index: z.coerce.number().min(0),
})

type FormData = z.infer<typeof schema>

function EntryDialog({
  gradeId,
  entry,
  nextOrder,
  onDone,
}: {
  gradeId: string
  entry?: TimetableEntry
  nextOrder: number
  onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      day_of_week: entry?.day_of_week ?? 0,
      subject: entry?.subject ?? '',
      start_time: entry?.start_time?.slice(0, 5) ?? '',
      end_time: entry?.end_time?.slice(0, 5) ?? '',
      teacher: entry?.teacher ?? '',
      notes: entry?.notes ?? '',
      order_index: entry?.order_index ?? nextOrder,
    },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const payload = { ...data, grade_id: gradeId, teacher: data.teacher || null, notes: data.notes || null }

    if (entry) {
      const { error } = await supabase.from('timetables').update(payload).eq('id', entry.id)
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Entry updated')
    } else {
      const { error } = await supabase.from('timetables').insert(payload)
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Entry added')
    }
    setOpen(false)
    onDone()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        {entry ? (
          <Button variant="ghost" size="sm"><Pencil className="w-3.5 h-3.5 mr-1" /> Edit</Button>
        ) : (
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-accent">
            <Plus className="w-4 h-4 mr-1" /> Add Entry
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{entry ? 'Edit Timetable Entry' : 'Add Timetable Entry'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Day *</Label>
            <Select
              defaultValue={String(entry?.day_of_week ?? 0)}
              onValueChange={(v) => setValue('day_of_week', Number(v))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAYS.map((d, i) => (
                  <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Subject *</Label>
            <Input placeholder="e.g. Mathematics" {...register('subject')} />
            {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start time *</Label>
              <Input type="time" {...register('start_time')} />
              {errors.start_time && <p className="text-xs text-destructive">{errors.start_time.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>End time *</Label>
              <Input type="time" {...register('end_time')} />
              {errors.end_time && <p className="text-xs text-destructive">{errors.end_time.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Teacher</Label>
            <Input placeholder="e.g. Mr. Ramgoolam" {...register('teacher')} />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea placeholder="e.g. Bring exercise book" rows={2} {...register('notes')} />
          </div>
          <div className="space-y-2">
            <Label>Order</Label>
            <Input type="number" min="0" {...register('order_index')} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1 bg-primary text-primary-foreground hover:bg-accent">
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {entry ? 'Save' : 'Add'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function AdminTimetablePage() {
  const params = useParams()
  const gradeId = params.id as string
  const [grade, setGrade] = useState<Grade | null>(null)
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const supabase = createClient()
    const [{ data: gradeData }, { data: timetableData }] = await Promise.all([
      supabase.from('grades').select('*').eq('id', gradeId).single(),
      supabase.from('timetables').select('*').eq('grade_id', gradeId).order('day_of_week').order('start_time'),
    ])
    setGrade(gradeData)
    setEntries(timetableData ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [gradeId])

  async function deleteEntry(id: string) {
    if (!confirm('Remove this timetable entry?')) return
    const supabase = createClient()
    const { error } = await supabase.from('timetables').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Entry removed')
    load()
  }

  // Group by day
  const byDay: Record<number, TimetableEntry[]> = {}
  for (const e of entries) {
    if (!byDay[e.day_of_week]) byDay[e.day_of_week] = []
    byDay[e.day_of_week].push(e)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/admin/grades"><ArrowLeft className="w-4 h-4 mr-1" /> Grades</Link>
        </Button>
      </div>

      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            {grade && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: grade.color }} />}
            <h1 className="text-2xl font-bold">{grade ? `${grade.name} — Timetable` : 'Timetable'}</h1>
          </div>
          <p className="text-muted-foreground text-sm">Add class schedule entries for this grade.</p>
        </div>
        {!loading && <EntryDialog gradeId={gradeId} nextOrder={entries.length} onDone={load} />}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : entries.length > 0 ? (
        <div className="space-y-6">
          {DAYS.map((day, dayIdx) => {
            const dayEntries = byDay[dayIdx]
            if (!dayEntries?.length) return null
            return (
              <div key={dayIdx}>
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">{day}</h2>
                <div className="rounded-xl border border-border/60 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 border-b border-border/60">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Time</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Subject</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Teacher</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Notes</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {dayEntries.map((e) => (
                        <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {e.start_time.slice(0, 5)} – {e.end_time.slice(0, 5)}
                          </td>
                          <td className="px-4 py-3 font-medium">{e.subject}</td>
                          <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{e.teacher ?? '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell max-w-xs truncate">{e.notes ?? '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <EntryDialog gradeId={gradeId} entry={e} nextOrder={entries.length} onDone={load} />
                              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => deleteEntry(e.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="py-16 text-center rounded-xl border border-border/60">
          <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No timetable entries yet for this grade.</p>
          <EntryDialog gradeId={gradeId} nextOrder={0} onDone={load} />
        </div>
      )}
    </div>
  )
}

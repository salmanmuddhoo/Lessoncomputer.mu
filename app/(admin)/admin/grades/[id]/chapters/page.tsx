'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Plus, Pencil, Trash2, ArrowLeft, BookOpen, GripVertical } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { Chapter, Grade } from '@/lib/types/database'

const schema = z.object({
  title: z.string().min(2, 'Title required'),
  description: z.string().optional(),
  order_index: z.coerce.number().min(0),
})

type FormData = z.infer<typeof schema>

function ChapterDialog({
  gradeId,
  chapter,
  nextOrder,
  onDone,
}: {
  gradeId: string
  chapter?: Chapter
  nextOrder: number
  onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: chapter?.title ?? '',
      description: chapter?.description ?? '',
      order_index: chapter?.order_index ?? nextOrder,
    },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()

    if (chapter) {
      const { error } = await supabase.from('chapters').update(data).eq('id', chapter.id)
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Chapter updated')
    } else {
      const { error } = await supabase.from('chapters').insert({ ...data, grade_id: gradeId })
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Chapter created')
    }

    setOpen(false)
    onDone()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        {chapter ? (
          <Button variant="ghost" size="sm"><Pencil className="w-3.5 h-3.5 mr-1" /> Edit</Button>
        ) : (
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-accent">
            <Plus className="w-4 h-4 mr-1" /> Add Chapter
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{chapter ? 'Edit Chapter' : 'Add Chapter'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input placeholder="e.g. Introduction to Algebra" {...register('title')} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea placeholder="Brief overview of this chapter..." rows={2} {...register('description')} />
          </div>
          <div className="space-y-2">
            <Label>Order</Label>
            <Input type="number" min="0" {...register('order_index')} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1 bg-primary text-primary-foreground hover:bg-accent">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {chapter ? 'Save' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function AdminChaptersPage() {
  const params = useParams()
  const gradeId = params.id as string
  const [grade, setGrade] = useState<Grade | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const supabase = createClient()
    const [{ data: gradeData }, { data: chaptersData }] = await Promise.all([
      supabase.from('grades').select('*').eq('id', gradeId).single(),
      supabase.from('chapters').select('*').eq('grade_id', gradeId).order('order_index'),
    ])
    setGrade(gradeData)
    setChapters(chaptersData ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [gradeId])

  async function deleteChapter(id: string) {
    if (!confirm('Delete this chapter? Videos in this chapter will be unassigned (not deleted).')) return
    const supabase = createClient()
    const { error } = await supabase.from('chapters').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Chapter deleted')
    load()
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/admin/grades"><ArrowLeft className="w-4 h-4 mr-1" /> Grades</Link>
        </Button>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            {grade && (
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: grade.color }} />
            )}
            <h1 className="text-2xl font-bold">
              {grade ? `${grade.name} — Chapters` : 'Chapters'}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Organise videos into chapters for this grade.
          </p>
        </div>
        {!loading && (
          <ChapterDialog
            gradeId={gradeId}
            nextOrder={chapters.length}
            onDone={load}
          />
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : chapters.length > 0 ? (
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border/60">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-8">#</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Chapter</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Description</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {chapters.map((ch, i) => (
                <tr key={ch.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{ch.order_index}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium">{ch.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell max-w-xs truncate">
                    {ch.description ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <ChapterDialog gradeId={gradeId} chapter={ch} nextOrder={chapters.length} onDone={load} />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => deleteChapter(ch.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-16 text-center rounded-xl border border-border/60">
          <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No chapters yet for this grade.</p>
          <ChapterDialog gradeId={gradeId} nextOrder={0} onDone={load} />
        </div>
      )}
    </div>
  )
}

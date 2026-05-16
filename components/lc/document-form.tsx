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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { Document } from '@/lib/types/database'
import type { PackageOption } from '@/components/lc/video-form'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  file_url: z.string().url('Please enter a valid URL').min(1, 'Document URL is required'),
  file_name: z.string().optional(),
  is_published: z.boolean(),
})

type FormData = z.infer<typeof schema>

interface DocumentFormProps {
  grades: { id: string; name: string; color: string }[]
  packages: PackageOption[]
  document?: Document
  initialGradeId?: string
  initialPackageId?: string
}

export function DocumentForm({ grades, packages, document, initialGradeId = '', initialPackageId = '' }: DocumentFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isEditing = !!document

  const defaultGradeId = initialGradeId || document?.grade_id || grades[0]?.id || ''
  const [gradeId, setGradeId] = useState(defaultGradeId)
  const [packageId, setPackageId] = useState(initialPackageId)
  const [chapterId, setChapterId] = useState(document?.chapter_id ?? '')

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: document?.title ?? '',
      description: document?.description ?? '',
      file_url: document?.file_url ?? '',
      file_name: document?.file_name ?? '',
      is_published: document?.is_published ?? false,
    },
  })

  const packagesForGrade = packages.filter((p) => p.grade_id === gradeId)
  const selectedPackage = packages.find((p) => p.id === packageId)
  const chaptersForPackage = selectedPackage
    ? [...selectedPackage.chapters].sort((a, b) => a.order_index - b.order_index)
    : []

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()

    const pkg = packages.find((p) => p.id === packageId)
    const resolvedGradeId = pkg?.grade_id ?? gradeId

    const payload = {
      title: data.title,
      description: data.description || null,
      grade_id: resolvedGradeId,
      chapter_id: chapterId || null,
      file_url: data.file_url,
      file_name: data.file_name || null,
      is_published: data.is_published,
    }

    if (isEditing) {
      const { error } = await supabase.from('documents').update(payload).eq('id', document.id)
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Document updated')
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('documents').insert({ ...payload, created_by: user!.id })
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Document added')
    }

    router.push('/admin/videos')
    router.refresh()
  }

  async function handleDelete() {
    if (!document || !confirm('Delete this document permanently?')) return
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('documents').delete().eq('id', document.id)
    if (error) { toast.error(error.message); setDeleting(false); return }
    toast.success('Document deleted')
    router.push('/admin/videos')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input id="title" placeholder="e.g. Chapter 1 Summary Notes" {...register('title')} />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" placeholder="What does this document cover?" rows={3} {...register('description')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="file_url">Document URL *</Label>
          <Input id="file_url" type="url" placeholder="https://drive.google.com/…" {...register('file_url')} />
          <p className="text-xs text-muted-foreground">Paste a link to the PDF (Google Drive, Dropbox, etc.)</p>
          {errors.file_url && <p className="text-xs text-destructive">{errors.file_url.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="file_name">Display filename (optional)</Label>
          <Input id="file_name" placeholder="e.g. chapter1-notes.pdf" {...register('file_name')} />
        </div>

        <div className="space-y-2">
          <Label>Grade *</Label>
          <Select
            value={gradeId}
            onValueChange={(v) => {
              setGradeId(v)
              setPackageId('')
              setChapterId('')
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Subscription Package</Label>
            <Select
              value={packageId || undefined}
              onValueChange={(v) => {
                setPackageId(v)
                setChapterId('')
              }}
              disabled={!gradeId || packagesForGrade.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !gradeId ? 'Select a grade first' :
                  packagesForGrade.length === 0 ? 'No packages for this grade' :
                  'Select package'
                } />
              </SelectTrigger>
              <SelectContent>
                {packagesForGrade.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {MONTHS[p.month - 1]} {p.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Chapter</Label>
            <Select
              value={chapterId || '__none__'}
              onValueChange={(v) => setChapterId(v === '__none__' ? '' : v)}
              disabled={!packageId || chaptersForPackage.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !packageId ? 'Select a package first' :
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
      </div>

      <Card className="border-border/60">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <Label>Published</Label>
              <p className="text-xs text-muted-foreground">Make this document visible to students</p>
            </div>
            <Switch checked={watch('is_published')} onCheckedChange={(v) => setValue('is_published', v)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground hover:bg-accent">
          {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {isEditing ? 'Save Changes' : 'Add Document'}
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

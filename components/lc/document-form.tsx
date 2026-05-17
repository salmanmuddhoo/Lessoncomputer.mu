'use client'

import { useState } from 'react'
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
import type { Document } from '@/lib/types/database'
import type { PackageOption } from '@/components/lc/video-form'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  file_url: z.string().url('Please enter a valid URL').min(1, 'Document URL is required'),
  file_name: z.string().optional(),
  is_published: z.boolean(),
  is_published_for_live: z.boolean(),
})

type FormData = z.infer<typeof schema>

interface DocumentFormProps {
  grades: { id: string; name: string; color: string }[]
  packages: PackageOption[]
  document?: Document & { is_published_for_live?: boolean }
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
  const [chapterId, setChapterId] = useState(document?.chapter_id ?? '')

  const [videoPackageId, setVideoPackageId] = useState(() => {
    if (!document?.chapter_id) return initialPackageId && packages.find(p => p.id === initialPackageId && p.package_type !== 'live_month') ? initialPackageId : ''
    const match = packages.find(p => p.package_type !== 'live_month' && p.chapters.some(ch => ch.id === document.chapter_id))
    return match?.id ?? ''
  })
  const [livePackageId, setLivePackageId] = useState(() => {
    if (!document?.chapter_id) return initialPackageId && packages.find(p => p.id === initialPackageId && p.package_type === 'live_month') ? initialPackageId : ''
    const match = packages.find(p => p.package_type === 'live_month' && p.chapters.some(ch => ch.id === document.chapter_id))
    return match?.id ?? ''
  })

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: document?.title ?? '',
      description: document?.description ?? '',
      file_url: document?.file_url ?? '',
      file_name: document?.file_name ?? '',
      is_published: document?.is_published ?? true,
      is_published_for_live: document?.is_published_for_live ?? false,
    },
  })

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

  async function onSubmit(data: FormData) {
    if (!videoPackageId && !livePackageId) {
      toast.error('Select at least one package (Video or Live Month)')
      return
    }
    setLoading(true)
    const supabase = createClient()

    const resolvedGradeId = packages.find(p => p.id === videoPackageId || p.id === livePackageId)?.grade_id ?? gradeId

    const payload: Record<string, any> = {
      title: data.title,
      description: data.description || null,
      grade_id: resolvedGradeId,
      chapter_id: chapterId || null,
      file_url: data.file_url,
      file_name: data.file_name || null,
      is_published: data.is_published,
      is_published_for_live: data.is_published_for_live,
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

        {/* Grade */}
        <div className="space-y-2">
          <Label>Grade *</Label>
          <Select
            value={gradeId}
            onValueChange={(v) => {
              setGradeId(v)
              setVideoPackageId('')
              setLivePackageId('')
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

        {/* Package selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-primary" /> Video Package
            </Label>
            <Select
              value={videoPackageId || '__none__'}
              onValueChange={(v) => {
                setVideoPackageId(v === '__none__' ? '' : v)
                setChapterId('')
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
                setChapterId('')
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
            value={chapterId || '__none__'}
            onValueChange={(v) => setChapterId(v === '__none__' ? '' : v)}
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
              <p className="text-xs text-muted-foreground">Visible to live class subscribers</p>
            </div>
            <Switch checked={watch('is_published_for_live')} onCheckedChange={(v) => setValue('is_published_for_live', v)} />
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

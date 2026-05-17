'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Loader2, Plus, Pencil, Trash2, Clock, Eye, EyeOff, Video,
  FolderOpen, ChevronDown, ChevronUp, Package, FileText, Radio,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface Grade {
  id: string
  name: string
  color: string
}

interface Chapter {
  id: string
  grade_id: string
  title: string
  order_index: number
}

interface PkgInfo {
  id: string
  grade_id: string
  month: number | null
  year: number | null
  package_type: string | null
  chapterIds: string[]
}

interface VideoRow {
  id: string
  title: string
  grade_id: string
  chapter_id: string | null
  is_free: boolean
  is_demo: boolean
  is_published: boolean
  duration_minutes: number | null
  grade: Grade | null
  chapter: Chapter | null
}

interface DocumentRow {
  id: string
  title: string
  grade_id: string
  chapter_id: string | null
  file_name: string | null
  is_published: boolean
}

type ContentItem =
  | { type: 'video'; data: VideoRow }
  | { type: 'document'; data: DocumentRow }

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<VideoRow[]>([])
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [pkgInfos, setPkgInfos] = useState<PkgInfo[]>([])
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [collapsedGrades, setCollapsedGrades] = useState<Set<string>>(new Set())
  const [collapsedChapters, setCollapsedChapters] = useState<Set<string>>(new Set())

  function toggleGrade(key: string) {
    setCollapsedGrades((prev) => {
      const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next
    })
  }
  function toggleChapter(key: string) {
    setCollapsedChapters((prev) => {
      const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next
    })
  }

  const load = useCallback(async () => {
    const supabase = createClient()
    const [
      { data: videoData },
      { data: documentData },
      { data: gradeData },
      { data: chapterData },
      { data: pkgData },
    ] = await Promise.all([
      supabase
        .from('videos')
        .select('id, title, grade_id, chapter_id, is_free, is_demo, is_published, duration_minutes, grade:grades(id,name,color), chapter:chapters(id,grade_id,title,order_index)')
        .order('created_at', { ascending: false }),
      supabase
        .from('documents')
        .select('id, title, grade_id, chapter_id, file_name, is_published')
        .order('created_at', { ascending: false }),
      supabase.from('grades').select('id,name,color').eq('is_active', true).order('order_index'),
      supabase.from('chapters').select('id,grade_id,title,order_index').order('order_index'),
      supabase.from('subscription_packages')
        .select('id, grade_id, month, year, package_type, subscription_package_chapters(chapter_id)')
        .eq('is_active', true)
        .order('year', { ascending: true })
        .order('month', { ascending: true }),
    ])
    setVideos((videoData ?? []) as VideoRow[])
    setDocuments((documentData ?? []) as DocumentRow[])
    setGrades(gradeData ?? [])
    setChapters(chapterData ?? [])
    setPkgInfos((pkgData ?? []).map((p: any) => ({
      id: p.id,
      grade_id: p.grade_id,
      month: p.month ?? null,
      year: p.year ?? null,
      package_type: p.package_type ?? null,
      chapterIds: (p.subscription_package_chapters ?? []).map((c: any) => c.chapter_id),
    })))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDeleteVideo(video: VideoRow) {
    if (!confirm(`Delete "${video.title}" permanently?`)) return
    setDeleting(video.id)
    const supabase = createClient()
    const { error } = await supabase.from('videos').delete().eq('id', video.id)
    if (error) { toast.error(error.message); setDeleting(null); return }
    toast.success('Video deleted')
    setDeleting(null)
    load()
  }

  async function handleDeleteDocument(doc: DocumentRow) {
    if (!confirm(`Delete "${doc.title}" permanently?`)) return
    setDeleting(doc.id)
    const supabase = createClient()
    const { error } = await supabase.from('documents').delete().eq('id', doc.id)
    if (error) { toast.error(error.message); setDeleting(null); return }
    toast.success('Document deleted')
    setDeleting(null)
    load()
  }

  const filteredVideos = gradeFilter === 'all' ? videos : videos.filter((v) => v.grade_id === gradeFilter)
  const filteredDocuments = gradeFilter === 'all' ? documents : documents.filter((d) => d.grade_id === gradeFilter)

  const activeGrades = gradeFilter === 'all'
    ? grades.filter((g) =>
        filteredVideos.some((v) => v.grade_id === g.id) ||
        filteredDocuments.some((d) => d.grade_id === g.id)
      )
    : grades.filter((g) => g.id === gradeFilter)

  function getChaptersForGrade(gradeId: string) {
    return chapters
      .filter((c) => c.grade_id === gradeId)
      .sort((a, b) => a.order_index - b.order_index)
  }

  function getContentForChapter(gradeId: string, chapterId: string | null): ContentItem[] {
    const vids = filteredVideos
      .filter((v) => v.grade_id === gradeId && v.chapter_id === chapterId)
      .map((v): ContentItem => ({ type: 'video', data: v }))
    const docs = filteredDocuments
      .filter((d) => d.grade_id === gradeId && d.chapter_id === chapterId)
      .map((d): ContentItem => ({ type: 'document', data: d }))
    return [...vids, ...docs]
  }

  function getPackageTags(gradeId: string, chapterId: string): { inVideo: boolean; inLive: boolean } {
    const gradePkgs = pkgInfos.filter((p) => p.grade_id === gradeId)
    const inVideo = gradePkgs.some((p) => p.package_type !== 'live_month' && p.chapterIds.includes(chapterId))
    const inLive = gradePkgs.some((p) => p.package_type === 'live_month' && p.chapterIds.includes(chapterId))
    return { inVideo, inLive }
  }

  const totalCount = filteredVideos.length + filteredDocuments.length

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Tuition</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''} · {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-accent">
              <Plus className="w-4 h-4 mr-1" /> Add Content <ChevronDown className="w-3.5 h-3.5 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/admin/videos/new" className="flex items-center gap-2">
                <Video className="w-4 h-4" /> Add Video
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/videos/documents/new" className="flex items-center gap-2">
                <FileText className="w-4 h-4" /> Add Document
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Grade filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setGradeFilter('all')}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${gradeFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}
        >
          All ({videos.length + documents.length})
        </button>
        {grades.map((g) => (
          <button
            key={g.id}
            onClick={() => setGradeFilter(g.id)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${gradeFilter === g.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}
          >
            {g.name} ({videos.filter((v) => v.grade_id === g.id).length + documents.filter((d) => d.grade_id === g.id).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : totalCount === 0 ? (
        <div className="py-20 text-center rounded-xl border border-border/60">
          <Video className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No content yet.</p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="mt-4 bg-primary text-primary-foreground hover:bg-accent">
                <Plus className="w-4 h-4 mr-1" /> Add Content
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild>
                <Link href="/admin/videos/new" className="flex items-center gap-2">
                  <Video className="w-4 h-4" /> Add Video
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/videos/documents/new" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Add Document
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <div className="space-y-4">
          {activeGrades.map((grade) => {
            const gradeVideos = filteredVideos.filter((v) => v.grade_id === grade.id)
            const gradeDocuments = filteredDocuments.filter((d) => d.grade_id === grade.id)
            if (!gradeVideos.length && !gradeDocuments.length) return null
            const isGradeCollapsed = collapsedGrades.has(grade.id)
            const gradeTotal = gradeVideos.length + gradeDocuments.length
            const gradeChapters = getChaptersForGrade(grade.id)

            return (
              <div key={grade.id} className="rounded-xl border border-border/60 overflow-hidden">
                <button
                  onClick={() => toggleGrade(grade.id)}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-card hover:bg-muted/20 transition-colors text-left"
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: grade.color }} />
                  <span className="text-sm font-bold flex-1" style={{ color: grade.color }}>{grade.name}</span>
                  <span className="text-xs text-muted-foreground mr-2">{gradeTotal} item{gradeTotal !== 1 ? 's' : ''}</span>
                  {isGradeCollapsed
                    ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    : <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  }
                </button>

                {!isGradeCollapsed && (
                  <div className="divide-y divide-border/40">
                    {gradeChapters.map((ch) => {
                      const chContent = getContentForChapter(grade.id, ch.id)
                      if (!chContent.length) return null
                      const isChCollapsed = collapsedChapters.has(ch.id)

                      return (
                        <div key={ch.id}>
                          <button
                            onClick={() => toggleChapter(ch.id)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
                          >
                            <FolderOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="text-xs font-semibold flex-1">{ch.title}</span>
                            <span className="text-xs text-muted-foreground mr-2">{chContent.length} item{chContent.length !== 1 ? 's' : ''}</span>
                            {isChCollapsed
                              ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              : <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            }
                          </button>
                          {!isChCollapsed && (
                            <ContentTable
                              items={chContent}
                              onDeleteVideo={handleDeleteVideo}
                              onDeleteDocument={handleDeleteDocument}
                              deleting={deleting}
                              pkgInfos={pkgInfos}
                            />
                          )}
                        </div>
                      )
                    })}

                    {(() => {
                      const uncategorized = getContentForChapter(grade.id, null)
                      if (!uncategorized.length) return null
                      return (
                        <div>
                          <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/20">
                            <Video className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs font-semibold text-muted-foreground flex-1">Uncategorized</span>
                            <span className="text-xs text-muted-foreground">{uncategorized.length} item{uncategorized.length !== 1 ? 's' : ''}</span>
                          </div>
                          <ContentTable
                            items={uncategorized}
                            onDeleteVideo={handleDeleteVideo}
                            onDeleteDocument={handleDeleteDocument}
                            deleting={deleting}
                            pkgInfos={pkgInfos}
                          />
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function getItemTags(pkgInfos: PkgInfo[], gradeId: string, chapterId: string | null) {
  if (!chapterId) return { inVideo: false, inLive: false }
  const gradePkgs = pkgInfos.filter((p) => p.grade_id === gradeId)
  return {
    inVideo: gradePkgs.some((p) => p.package_type !== 'live_month' && p.chapterIds.includes(chapterId)),
    inLive: gradePkgs.some((p) => p.package_type === 'live_month' && p.chapterIds.includes(chapterId)),
  }
}

function ContentTable({
  items,
  onDeleteVideo,
  onDeleteDocument,
  deleting,
  pkgInfos,
}: {
  items: ContentItem[]
  onDeleteVideo: (v: VideoRow) => void
  onDeleteDocument: (d: DocumentRow) => void
  deleting: string | null
  pkgInfos: PkgInfo[]
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[480px]">
        <tbody className="divide-y divide-border/30">
          {items.map((item) => {
            if (item.type === 'video') {
              const v = item.data
              const { inVideo, inLive } = getItemTags(pkgInfos, v.grade_id, v.chapter_id)
              return (
                <tr key={`v-${v.id}`} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 w-full">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs gap-1 shrink-0 text-primary border-primary/30 bg-primary/5">
                        <Video className="w-2.5 h-2.5" /> Video
                      </Badge>
                      <span className="font-medium line-clamp-1 max-w-[180px] block">{v.title}</span>
                      {inVideo && (
                        <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-4 text-primary border-primary/30 bg-primary/5 shrink-0">
                          <Package className="w-2.5 h-2.5" /> Video Pkg
                        </Badge>
                      )}
                      {inLive && (
                        <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-4 text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400 shrink-0">
                          <Radio className="w-2.5 h-2.5" /> Live
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {v.is_demo && (
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">Demo</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${v.is_published ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                      {v.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {v.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground text-xs">
                    {v.duration_minutes ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {v.duration_minutes}m
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/videos/${v.id}/edit`}><Pencil className="w-3.5 h-3.5" /></Link>
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => onDeleteVideo(v)}
                        disabled={deleting === v.id}
                      >
                        {deleting === v.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            }

            const d = item.data
            const { inVideo: dInVideo, inLive: dInLive } = getItemTags(pkgInfos, d.grade_id, d.chapter_id)
            return (
              <tr key={`d-${d.id}`} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-2.5 w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs gap-1 shrink-0 text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 dark:text-orange-400">
                      <FileText className="w-2.5 h-2.5" /> PDF
                    </Badge>
                    <span className="font-medium line-clamp-1 max-w-[180px] block">{d.title}</span>
                    {dInVideo && (
                      <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-4 text-primary border-primary/30 bg-primary/5 shrink-0">
                        <Package className="w-2.5 h-2.5" /> Video Pkg
                      </Badge>
                    )}
                    {dInLive && (
                      <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-4 text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400 shrink-0">
                        <Radio className="w-2.5 h-2.5" /> Live
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted-foreground" colSpan={2}>
                  {d.file_name ?? '—'}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${d.is_published ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                    {d.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {d.is_published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/videos/documents/${d.id}/edit`}><Pencil className="w-3.5 h-3.5" /></Link>
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => onDeleteDocument(d)}
                      disabled={deleting === d.id}
                    >
                      {deleting === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

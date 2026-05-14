'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Loader2, Plus, Pencil, Trash2, Clock, Eye, EyeOff, Video, FolderOpen, ChevronDown, ChevronUp, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

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
  month: number
  year: number
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

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<VideoRow[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [pkgInfos, setPkgInfos] = useState<PkgInfo[]>([])
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())
  const [collapsedChapters, setCollapsedChapters] = useState<Set<string>>(new Set())

  function toggleMonth(key: string) {
    setCollapsedMonths((prev) => {
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
    const [{ data: videoData }, { data: gradeData }, { data: chapterData }, { data: pkgData }] = await Promise.all([
      supabase
        .from('videos')
        .select('id, title, grade_id, chapter_id, is_free, is_demo, is_published, duration_minutes, grade:grades(id,name,color), chapter:chapters(id,grade_id,title,order_index)')
        .order('created_at', { ascending: false }),
      supabase.from('grades').select('id,name,color').eq('is_active', true).order('order_index'),
      supabase.from('chapters').select('id,grade_id,title,order_index').order('order_index'),
      supabase.from('subscription_packages')
        .select('id, grade_id, month, year, subscription_package_chapters(chapter_id)')
        .eq('is_active', true)
        .order('year', { ascending: true })
        .order('month', { ascending: true }),
    ])
    setVideos((videoData ?? []) as VideoRow[])
    setGrades(gradeData ?? [])
    setChapters(chapterData ?? [])
    setPkgInfos((pkgData ?? []).map((p: any) => ({
      id: p.id,
      grade_id: p.grade_id,
      month: p.month,
      year: p.year,
      chapterIds: (p.subscription_package_chapters ?? []).map((c: any) => c.chapter_id),
    })))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(video: VideoRow) {
    if (!confirm(`Delete "${video.title}" permanently?`)) return
    setDeleting(video.id)
    const supabase = createClient()
    const { error } = await supabase.from('videos').delete().eq('id', video.id)
    if (error) { toast.error(error.message); setDeleting(null); return }
    toast.success('Video deleted')
    setDeleting(null)
    load()
  }

  const filteredVideos = gradeFilter === 'all' ? videos : videos.filter((v) => v.grade_id === gradeFilter)

  const activeGrades = gradeFilter === 'all'
    ? grades.filter((g) => filteredVideos.some((v) => v.grade_id === g.id))
    : grades.filter((g) => g.id === gradeFilter)

  function getPkgsForGrade(gradeId: string) {
    return pkgInfos.filter((p) => p.grade_id === gradeId)
  }

  function getChaptersForPkg(pkg: PkgInfo) {
    return chapters
      .filter((c) => pkg.chapterIds.includes(c.id))
      .sort((a, b) => a.order_index - b.order_index)
  }

  function getVideosForChapter(gradeId: string, chapterId: string | null) {
    return filteredVideos.filter((v) => v.grade_id === gradeId && v.chapter_id === chapterId)
  }

  const totalCount = filteredVideos.length

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Videos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{totalCount} video{totalCount !== 1 ? 's' : ''}</p>
        </div>
        <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-accent">
          <Link href="/admin/videos/new">
            <Plus className="w-4 h-4 mr-1" /> Add Video
          </Link>
        </Button>
      </div>

      {/* Grade filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setGradeFilter('all')}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${gradeFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}
        >
          All ({videos.length})
        </button>
        {grades.map((g) => (
          <button
            key={g.id}
            onClick={() => setGradeFilter(g.id)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${gradeFilter === g.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}
          >
            {g.name} ({videos.filter((v) => v.grade_id === g.id).length})
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
          <p className="text-muted-foreground">No videos yet.</p>
          <Button asChild size="sm" className="mt-4 bg-primary text-primary-foreground hover:bg-accent">
            <Link href="/admin/videos/new"><Plus className="w-4 h-4 mr-1" /> Add Your First Video</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {activeGrades.map((grade) => {
            const gradeVideos = filteredVideos.filter((v) => v.grade_id === grade.id)
            if (!gradeVideos.length) return null
            const gradePkgs = getPkgsForGrade(grade.id)

            return (
              <div key={grade.id}>
                {gradeFilter === 'all' && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-5 rounded-full" style={{ backgroundColor: grade.color }} />
                    <h2 className="text-base font-bold" style={{ color: grade.color }}>{grade.name}</h2>
                    <span className="text-xs text-muted-foreground ml-1">{gradeVideos.length} video{gradeVideos.length !== 1 ? 's' : ''}</span>
                  </div>
                )}

                <div className="rounded-xl border border-border/60 overflow-hidden divide-y divide-border/40">
                  {/* Month → Chapter → Videos */}
                  {gradePkgs.map((pkg) => {
                    const pkgChapters = getChaptersForPkg(pkg)
                    const pkgVideos = pkgChapters.flatMap((ch) => getVideosForChapter(grade.id, ch.id))
                    if (!pkgVideos.length) return null
                    const monthKey = pkg.id
                    const isMonthCollapsed = collapsedMonths.has(monthKey)

                    return (
                      <div key={pkg.id}>
                        {/* Month header */}
                        <button
                          onClick={() => toggleMonth(monthKey)}
                          className="w-full flex items-center gap-2 px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
                        >
                          <Package className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="text-xs font-bold flex-1">{MONTHS[pkg.month - 1]} {pkg.year}</span>
                          <span className="text-xs text-muted-foreground mr-2">{pkgVideos.length} video{pkgVideos.length !== 1 ? 's' : ''}</span>
                          {isMonthCollapsed
                            ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            : <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          }
                        </button>

                        {!isMonthCollapsed && pkgChapters.map((ch) => {
                          const chVideos = getVideosForChapter(grade.id, ch.id)
                          if (!chVideos.length) return null
                          const chKey = `${pkg.id}-${ch.id}`
                          const isChCollapsed = collapsedChapters.has(chKey)

                          return (
                            <div key={ch.id}>
                              <button
                                onClick={() => toggleChapter(chKey)}
                                className="w-full flex items-center gap-2 pl-8 pr-4 py-2.5 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
                              >
                                <FolderOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span className="text-xs font-semibold flex-1">{ch.title}</span>
                                <span className="text-xs text-muted-foreground mr-2">{chVideos.length} video{chVideos.length !== 1 ? 's' : ''}</span>
                                {isChCollapsed
                                  ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  : <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                }
                              </button>
                              {!isChCollapsed && (
                                <div className="pl-12">
                                  <VideoTable videos={chVideos} onDelete={handleDelete} deleting={deleting} />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}

                  {/* Uncategorized (no chapter / no package) */}
                  {(() => {
                    const uncategorized = getVideosForChapter(grade.id, null)
                    if (!uncategorized.length) return null
                    return (
                      <div>
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/20">
                          <Video className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs font-semibold text-muted-foreground flex-1">Uncategorized</span>
                          <span className="text-xs text-muted-foreground">{uncategorized.length} video{uncategorized.length !== 1 ? 's' : ''}</span>
                        </div>
                        <VideoTable videos={uncategorized} onDelete={handleDelete} deleting={deleting} />
                      </div>
                    )
                  })()}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function VideoTable({
  videos,
  onDelete,
  deleting,
}: {
  videos: VideoRow[]
  onDelete: (v: VideoRow) => void
  deleting: string | null
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[480px]">
        <tbody className="divide-y divide-border/30">
          {videos.map((v) => (
            <tr key={v.id} className="hover:bg-muted/20 transition-colors">
              <td className="px-4 py-2.5 w-full">
                <span className="font-medium line-clamp-1 max-w-[260px] block">{v.title}</span>
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
                    onClick={() => onDelete(v)}
                    disabled={deleting === v.id}
                  >
                    {deleting === v.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

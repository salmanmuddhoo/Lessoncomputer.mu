'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Loader2, CalendarDays, Settings2, Video, FileText,
  Eye, EyeOff, FolderOpen, ChevronDown, ChevronUp, Pencil, Radio, Clock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { extractStreamableId } from '@/components/lc/video-form'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

interface Grade { id: string; name: string; color: string }
interface Chapter { id: string; title: string; order_index: number; is_visible_to_subscribers: boolean }
interface MonthPackage { id: string | null; month: number; year: number; chapterIds: string[] }

interface VideoItem {
  id: string
  title: string
  chapter_id: string
  streamable_url_live: string | null
  is_published_for_live: boolean
  is_published: boolean
  duration_minutes: number | null
  updated_at: string
}

interface DocItem {
  id: string
  title: string
  chapter_id: string
  is_published_for_live: boolean
  is_published: boolean
  file_name: string | null
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AdminLiveMonthsPage() {
  const [grades, setGrades] = useState<Grade[]>([])
  const [selectedGradeId, setSelectedGradeId] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [monthPackages, setMonthPackages] = useState<MonthPackage[]>([])

  const [manageMonth, setManageMonth] = useState<number | null>(null)
  const [dialogChapters, setDialogChapters] = useState<Chapter[]>([])
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([])
  const [visibilityMap, setVisibilityMap] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

  // Content tab
  const [contentTab, setContentTab] = useState<'chapters' | 'content'>('chapters')
  const [contentVideos, setContentVideos] = useState<VideoItem[]>([])
  const [contentDocs, setContentDocs] = useState<DocItem[]>([])
  const [contentLoading, setContentLoading] = useState(false)
  const [videoEdits, setVideoEdits] = useState<Record<string, { url: string; publishedForLive: boolean }>>({})
  const [docEdits, setDocEdits] = useState<Record<string, { publishedForLive: boolean }>>({})
  const [savingContent, setSavingContent] = useState(false)
  const [openContentChapters, setOpenContentChapters] = useState<Set<string>>(new Set())

  const supabase = createClient()
  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]

  useEffect(() => {
    supabase.from('grades').select('id,name,color').eq('is_active', true).order('order_index')
      .then(({ data }) => {
        setGrades(data ?? [])
        if (data && data.length > 0) setSelectedGradeId(data[0].id)
      })
  }, [])

  const load = useCallback(async () => {
    if (!selectedGradeId) return
    setLoading(true)

    const [{ data: chData }, { data: pkgData }] = await Promise.all([
      supabase.from('chapters').select('id,title,order_index,is_visible_to_subscribers')
        .eq('grade_id', selectedGradeId).order('order_index'),
      supabase.from('subscription_packages')
        .select('id,month,year,subscription_package_chapters(chapter_id)')
        .eq('grade_id', selectedGradeId)
        .eq('package_type', 'live_month')
        .eq('year', selectedYear),
    ])

    setChapters(chData ?? [])

    const pkgMap: Record<number, MonthPackage> = {}
    for (const p of pkgData ?? []) {
      pkgMap[p.month] = {
        id: p.id,
        month: p.month,
        year: p.year,
        chapterIds: ((p as any).subscription_package_chapters ?? []).map((c: any) => c.chapter_id),
      }
    }

    const allMonths: MonthPackage[] = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      return pkgMap[m] ?? { id: null, month: m, year: selectedYear, chapterIds: [] }
    })

    setMonthPackages(allMonths)
    setLoading(false)
  }, [selectedGradeId, selectedYear])

  useEffect(() => { load() }, [load])

  function openManage(month: number) {
    const pkg = monthPackages.find((p) => p.month === month)
    const initSelected = pkg?.chapterIds ?? []

    const otherMonthChapterIds = new Set(
      monthPackages
        .filter((p) => p.month !== month && p.id !== null)
        .flatMap((p) => p.chapterIds)
    )

    const available = chapters.filter(
      (ch) => !otherMonthChapterIds.has(ch.id) || initSelected.includes(ch.id)
    )

    const initVisibility: Record<string, boolean> = {}
    for (const ch of chapters) initVisibility[ch.id] = ch.is_visible_to_subscribers

    setDialogChapters(available)
    setSelectedChapterIds(initSelected)
    setVisibilityMap(initVisibility)
    setContentTab('chapters')
    setContentVideos([])
    setContentDocs([])
    setVideoEdits({})
    setDocEdits({})
    setOpenContentChapters(new Set())
    setManageMonth(month)
  }

  async function loadContent(chapterIds: string[]) {
    if (chapterIds.length === 0) {
      setContentVideos([])
      setContentDocs([])
      return
    }
    setContentLoading(true)
    const [{ data: vids }, { data: docs }] = await Promise.all([
      supabase.from('videos')
        .select('id,title,chapter_id,streamable_url_live,is_published_for_live,is_published,duration_minutes,updated_at')
        .in('chapter_id', chapterIds)
        .order('created_at', { ascending: false }),
      supabase.from('documents')
        .select('id,title,chapter_id,is_published_for_live,is_published,file_name')
        .in('chapter_id', chapterIds)
        .order('created_at', { ascending: false }),
    ])
    const videos = (vids ?? []) as VideoItem[]
    const documents = (docs ?? []) as DocItem[]
    setContentVideos(videos)
    setContentDocs(documents)

    const vEdits: Record<string, { url: string; publishedForLive: boolean }> = {}
    for (const v of videos) vEdits[v.id] = { url: v.streamable_url_live ?? '', publishedForLive: v.is_published_for_live }
    const dEdits: Record<string, { publishedForLive: boolean }> = {}
    for (const d of documents) dEdits[d.id] = { publishedForLive: d.is_published_for_live }

    setVideoEdits(vEdits)
    setDocEdits(dEdits)
    // Default all chapters open
    setOpenContentChapters(new Set(chapterIds))
    setContentLoading(false)
  }

  function toggleChapterSelection(id: string) {
    setSelectedChapterIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  function toggleVisibility(id: string, val: boolean) {
    setVisibilityMap((prev) => ({ ...prev, [id]: val }))
  }

  function toggleContentChapter(id: string) {
    setOpenContentChapters((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSave() {
    if (manageMonth == null || !selectedGradeId) return
    setSaving(true)

    const monthName = MONTHS[manageMonth - 1]
    const name = `${monthName} ${selectedYear}`
    const pkg = monthPackages.find((p) => p.month === manageMonth)

    let pkgId = pkg?.id ?? null

    if (pkgId) {
      const { error } = await supabase.from('subscription_packages').update({ name }).eq('id', pkgId)
      if (error) { toast.error(error.message); setSaving(false); return }
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('subscription_packages')
        .insert({
          name,
          grade_id: selectedGradeId,
          month: manageMonth,
          year: selectedYear,
          price: 0,
          package_type: 'live_month',
          is_active: true,
          created_by: user!.id,
        })
        .select('id')
        .single()
      if (error) { toast.error(error.message); setSaving(false); return }
      pkgId = data.id
    }

    await supabase.from('subscription_package_chapters').delete().eq('package_id', pkgId!)
    if (selectedChapterIds.length > 0) {
      const { error } = await supabase.from('subscription_package_chapters')
        .insert(selectedChapterIds.map((cid) => ({ package_id: pkgId!, chapter_id: cid })))
      if (error) { toast.error(error.message); setSaving(false); return }
    }

    const visibilityUpdates = Object.entries(visibilityMap).map(([id, val]) =>
      supabase.from('chapters').update({ is_visible_to_subscribers: val }).eq('id', id)
    )
    await Promise.all(visibilityUpdates)

    toast.success(`${name} saved`)
    setSaving(false)
    load()
    setMonthPackages((prev) => prev.map((p) =>
      p.month === manageMonth ? { ...p, id: pkgId, chapterIds: selectedChapterIds } : p
    ))
  }

  async function handleSaveContent() {
    setSavingContent(true)
    const videoUpdates = Object.entries(videoEdits).map(([id, edit]) => {
      const streamableId = edit.url ? extractStreamableId(edit.url) : null
      const url = streamableId ? `https://streamable.com/e/${streamableId}` : (edit.url || null)
      return supabase.from('videos').update({
        streamable_url_live: url,
        is_published_for_live: edit.publishedForLive,
      }).eq('id', id)
    })
    const docUpdates = Object.entries(docEdits).map(([id, edit]) =>
      supabase.from('documents').update({ is_published_for_live: edit.publishedForLive }).eq('id', id)
    )
    const results = await Promise.all([...videoUpdates, ...docUpdates])
    const err = results.find((r) => r.error)?.error
    if (err) { toast.error(err.message); setSavingContent(false); return }

    // Refresh content to pick up updated_at timestamps
    await loadContent(selectedChapterIds)
    toast.success('Content updated')
    setSavingContent(false)
  }

  // Chapters selected for this month, sorted by order_index
  const sortedSelectedChapters = dialogChapters
    .filter((ch) => selectedChapterIds.includes(ch.id))
    .sort((a, b) => a.order_index - b.order_index)

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Live Months</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage monthly content folders for live class subscribers
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="w-52">
          <Select value={selectedGradeId} onValueChange={setSelectedGradeId}>
            <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
            <SelectContent>
              {grades.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-36">
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !selectedGradeId ? (
        <div className="py-20 text-center rounded-xl border border-border/60">
          <CalendarDays className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">Select a grade to manage live months.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {monthPackages.map((pkg) => (
            <div
              key={pkg.month}
              className={`rounded-xl border p-4 flex flex-col gap-3 ${
                pkg.chapterIds.length > 0 ? 'border-primary/30 bg-primary/5' : 'border-border/60 bg-card'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{MONTHS[pkg.month - 1]}</span>
                {pkg.chapterIds.length > 0 && (
                  <Badge variant="outline" className="text-xs">{pkg.chapterIds.length} ch</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {pkg.chapterIds.length === 0
                  ? 'No chapters assigned'
                  : `${pkg.chapterIds.length} chapter${pkg.chapterIds.length !== 1 ? 's' : ''} assigned`
                }
              </p>
              <Button size="sm" variant="outline" onClick={() => openManage(pkg.month)} className="w-full">
                <Settings2 className="w-3.5 h-3.5 mr-1.5" /> Manage
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={manageMonth != null} onOpenChange={(open) => { if (!open) setManageMonth(null) }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {manageMonth != null ? `${MONTHS[manageMonth - 1]} ${selectedYear}` : ''}
            </DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-border/60 -mx-1">
            <button
              onClick={() => setContentTab('chapters')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                contentTab === 'chapters'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Chapters
            </button>
            <button
              onClick={() => {
                setContentTab('content')
                loadContent(selectedChapterIds)
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                contentTab === 'content'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Videos &amp; Docs
            </button>
          </div>

          {/* ── Chapters tab ── */}
          {contentTab === 'chapters' && (
            <div className="space-y-4 py-2">
              <div>
                <p className="text-sm font-medium mb-1">Assign chapters to this month</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Chapters already assigned to other months are hidden.
                </p>
                {dialogChapters.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No chapters available for this grade.</p>
                ) : (
                  <div className="rounded-lg border border-border/60 divide-y divide-border/40 max-h-64 overflow-y-auto">
                    {dialogChapters.map((ch) => (
                      <label
                        key={ch.id}
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedChapterIds.includes(ch.id)}
                          onChange={() => toggleChapterSelection(ch.id)}
                          className="accent-primary"
                        />
                        <span className="text-sm flex-1">{ch.title}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Chapter visibility for subscribers</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Toggle which chapters are visible to live-class subscribers across all months.
                </p>
                {dialogChapters.length > 0 && (
                  <div className="rounded-lg border border-border/60 divide-y divide-border/40 max-h-48 overflow-y-auto">
                    {dialogChapters.map((ch) => (
                      <div key={ch.id} className="flex items-center justify-between px-3 py-2.5">
                        <span className="text-sm">{ch.title}</span>
                        <Switch
                          checked={visibilityMap[ch.id] ?? false}
                          onCheckedChange={(v) => toggleVisibility(ch.id, v)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Videos & Docs tab ── */}
          {contentTab === 'content' && (
            <div className="py-2">
              {contentLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : sortedSelectedChapters.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Assign chapters first, then switch to this tab.
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedSelectedChapters.map((ch) => {
                    const chVideos = contentVideos.filter((v) => v.chapter_id === ch.id)
                    const chDocs = contentDocs.filter((d) => d.chapter_id === ch.id)
                    const total = chVideos.length + chDocs.length
                    const isOpen = openContentChapters.has(ch.id)

                    return (
                      <div key={ch.id} className="rounded-xl border border-border/60 overflow-hidden">
                        <button
                          onClick={() => toggleContentChapter(ch.id)}
                          className="w-full flex items-center gap-2 px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
                        >
                          <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-sm font-semibold flex-1">{ch.title}</span>
                          <span className="text-xs text-muted-foreground mr-2">
                            {total} item{total !== 1 ? 's' : ''}
                          </span>
                          {isOpen
                            ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                            : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                          }
                        </button>

                        {isOpen && (
                          <div className="divide-y divide-border/40">
                            {chVideos.length === 0 && chDocs.length === 0 ? (
                              <p className="px-4 py-4 text-xs text-muted-foreground">
                                No videos or documents in this chapter yet.
                              </p>
                            ) : (
                              <>
                                {chVideos.map((v) => {
                                  const edit = videoEdits[v.id] ?? { url: v.streamable_url_live ?? '', publishedForLive: v.is_published_for_live }
                                  const detectedId = edit.url ? extractStreamableId(edit.url) : null
                                  const hasLiveUrl = !!v.streamable_url_live

                                  return (
                                    <div key={v.id} className="px-4 py-3 space-y-2.5">
                                      {/* Row 1: title + badges + actions */}
                                      <div className="flex items-start gap-2 flex-wrap">
                                        <Badge variant="outline" className="text-xs gap-1 shrink-0 text-primary border-primary/30 bg-primary/5">
                                          <Video className="w-2.5 h-2.5" /> Video
                                        </Badge>
                                        <span className="font-medium text-sm flex-1 min-w-0">{v.title}</span>

                                        {/* Live URL badge with date */}
                                        {hasLiveUrl && (
                                          <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-5 text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400 shrink-0">
                                            <Radio className="w-2.5 h-2.5" /> Live URL · {fmtDate(v.updated_at)}
                                          </Badge>
                                        )}

                                        {v.duration_minutes && (
                                          <span className="text-xs text-muted-foreground flex items-center gap-0.5 shrink-0">
                                            <Clock className="w-3 h-3" />{v.duration_minutes}m
                                          </span>
                                        )}

                                        {/* Published for video badge */}
                                        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${v.is_published ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                                          {v.is_published ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                                          {v.is_published ? 'Published' : 'Draft'}
                                        </span>

                                        <Button variant="ghost" size="sm" asChild className="shrink-0 h-6 w-6 p-0">
                                          <Link href={`/admin/videos/${v.id}/edit`} title="Edit full details">
                                            <Pencil className="w-3.5 h-3.5" />
                                          </Link>
                                        </Button>
                                      </div>

                                      {/* Row 2: live URL input + publish_for_live toggle */}
                                      <div className="flex items-end gap-3 pl-0">
                                        <div className="flex-1 min-w-0">
                                          <Label className="text-[10px] text-muted-foreground mb-1 block">
                                            Live Classes URL
                                          </Label>
                                          <Input
                                            value={edit.url}
                                            onChange={(e) => setVideoEdits((prev) => ({
                                              ...prev,
                                              [v.id]: { ...edit, url: e.target.value },
                                            }))}
                                            placeholder="https://streamable.com/…"
                                            className="text-xs h-8 font-mono"
                                          />
                                          {detectedId && (
                                            <p className="text-[10px] text-green-600 dark:text-green-400 mt-0.5">
                                              ✓ {detectedId}
                                            </p>
                                          )}
                                        </div>
                                        <div className="shrink-0 flex flex-col items-center gap-1 pb-0.5">
                                          <Label className="text-[10px] text-muted-foreground">Published for Live</Label>
                                          <div className="flex items-center gap-1">
                                            {edit.publishedForLive
                                              ? <Eye className="w-3 h-3 text-primary" />
                                              : <EyeOff className="w-3 h-3 text-muted-foreground" />
                                            }
                                            <Switch
                                              checked={edit.publishedForLive}
                                              onCheckedChange={(val) => setVideoEdits((prev) => ({
                                                ...prev,
                                                [v.id]: { ...edit, publishedForLive: val },
                                              }))}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}

                                {chDocs.map((d) => {
                                  const edit = docEdits[d.id] ?? { publishedForLive: d.is_published_for_live }
                                  return (
                                    <div key={d.id} className="px-4 py-3 flex items-center gap-2 flex-wrap">
                                      <Badge variant="outline" className="text-xs gap-1 shrink-0 text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 dark:text-orange-400">
                                        <FileText className="w-2.5 h-2.5" /> PDF
                                      </Badge>
                                      <span className="font-medium text-sm flex-1 min-w-0">{d.title}</span>
                                      {d.file_name && (
                                        <span className="text-xs text-muted-foreground shrink-0">{d.file_name}</span>
                                      )}
                                      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${d.is_published ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                                        {d.is_published ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                                        {d.is_published ? 'Published' : 'Draft'}
                                      </span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <Label className="text-[10px] text-muted-foreground">Live</Label>
                                        {edit.publishedForLive
                                          ? <Eye className="w-3 h-3 text-primary" />
                                          : <EyeOff className="w-3 h-3 text-muted-foreground" />
                                        }
                                        <Switch
                                          checked={edit.publishedForLive}
                                          onCheckedChange={(val) => setDocEdits((prev) => ({
                                            ...prev,
                                            [d.id]: { publishedForLive: val },
                                          }))}
                                        />
                                      </div>
                                      <Button variant="ghost" size="sm" asChild className="shrink-0 h-6 w-6 p-0">
                                        <Link href={`/admin/videos/documents/${d.id}/edit`} title="Edit full details">
                                          <Pencil className="w-3.5 h-3.5" />
                                        </Link>
                                      </Button>
                                    </div>
                                  )
                                })}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setManageMonth(null)}>Close</Button>
            {contentTab === 'chapters' ? (
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-primary text-primary-foreground hover:bg-accent"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save Chapters
              </Button>
            ) : (
              <Button
                onClick={handleSaveContent}
                disabled={savingContent || sortedSelectedChapters.length === 0}
                className="bg-primary text-primary-foreground hover:bg-accent"
              >
                {savingContent && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save Content
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

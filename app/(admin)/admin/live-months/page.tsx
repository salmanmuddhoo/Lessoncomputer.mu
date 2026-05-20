'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Loader2, CalendarDays, Settings2, Video, FileText,
  Eye, EyeOff, FolderOpen, ChevronDown, ChevronUp, Pencil, Radio, Clock, GitMerge, CheckCheck,
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
  streamable_url: string | null
  streamable_url_live: string | null
  is_published_for_live: boolean
  is_published: boolean
  duration_minutes: number | null
}

interface DocItem {
  id: string
  title: string
  chapter_id: string
  file_url: string | null
  file_url_live: string | null
  is_published_for_live: boolean
  is_published: boolean
  file_name: string | null
}

export default function AdminLiveMonthsPage() {
  const [grades, setGrades] = useState<Grade[]>([])
  const [selectedGradeId, setSelectedGradeId] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [monthPackages, setMonthPackages] = useState<MonthPackage[]>([])

  // Page-level content
  const [allVideos, setAllVideos] = useState<VideoItem[]>([])
  const [allDocs, setAllDocs] = useState<DocItem[]>([])
  const [videoEdits, setVideoEdits] = useState<Record<string, { url: string; publishedForLive: boolean }>>({})
  const [docEdits, setDocEdits] = useState<Record<string, { url: string; publishedForLive: boolean }>>({})
  const [savingItem, setSavingItem] = useState<string | null>(null)
  const [mergingChapter, setMergingChapter] = useState<string | null>(null)

  // Collapse state for months and chapters
  const [openMonths, setOpenMonths] = useState<Set<number>>(new Set())
  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set())

  // Manage modal (chapter assignment only — no tabs)
  const [manageMonth, setManageMonth] = useState<number | null>(null)
  const [dialogChapters, setDialogChapters] = useState<Chapter[]>([])
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([])
  const [visibilityMap, setVisibilityMap] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

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

    const chapterList = (chData ?? []) as Chapter[]
    setChapters(chapterList)

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

    // Load all content for chapters assigned to any month this year
    const allChapterIds = allMonths.flatMap((p) => p.chapterIds)
    if (allChapterIds.length > 0) {
      const [{ data: vids, error: vErr }, { data: docs, error: dErr }] = await Promise.all([
        supabase.from('videos')
          .select('id,title,chapter_id,streamable_url,streamable_url_live,is_published_for_live,is_published,duration_minutes')
          .in('chapter_id', allChapterIds)
          .order('created_at', { ascending: false }),
        supabase.from('documents')
          .select('id,title,chapter_id,file_url,file_url_live,is_published_for_live,is_published,file_name')
          .in('chapter_id', allChapterIds)
          .order('created_at', { ascending: false }),
      ])

      // If extended columns don't exist yet (migration not applied), fall back to base columns
      const [{ data: vidsBase }, { data: docsBase }] = vErr || dErr ? await Promise.all([
        supabase.from('videos')
          .select('id,title,chapter_id,streamable_url,is_published,duration_minutes')
          .in('chapter_id', allChapterIds)
          .order('created_at', { ascending: false }),
        supabase.from('documents')
          .select('id,title,chapter_id,file_url,is_published,file_name')
          .in('chapter_id', allChapterIds)
          .order('created_at', { ascending: false }),
      ]) : [{ data: null }, { data: null }]

      const videos = ((vErr ? vidsBase : vids) ?? []).map((v: any) => ({
        ...v,
        streamable_url: v.streamable_url ?? null,
        streamable_url_live: v.streamable_url_live ?? null,
        is_published_for_live: v.is_published_for_live ?? false,
      })) as VideoItem[]
      const documents = ((dErr ? docsBase : docs) ?? []).map((d: any) => ({
        ...d,
        file_url: d.file_url ?? null,
        file_url_live: d.file_url_live ?? null,
        is_published_for_live: d.is_published_for_live ?? false,
      })) as DocItem[]
      setAllVideos(videos)
      setAllDocs(documents)

      const vEdits: Record<string, { url: string; publishedForLive: boolean }> = {}
      for (const v of videos) vEdits[v.id] = { url: v.streamable_url_live ?? '', publishedForLive: v.is_published_for_live }
      const dEdits: Record<string, { url: string; publishedForLive: boolean }> = {}
      for (const d of documents) dEdits[d.id] = { url: d.file_url_live ?? '', publishedForLive: d.is_published_for_live }
      setVideoEdits(vEdits)
      setDocEdits(dEdits)
    } else {
      setAllVideos([])
      setAllDocs([])
      setVideoEdits({})
      setDocEdits({})
    }

    setLoading(false)
  }, [selectedGradeId, selectedYear])

  useEffect(() => { load() }, [load])


  function toggleMonth(m: number) {
    const pkg = monthPackages.find((p) => p.month === m)
    setOpenMonths((prev) => {
      const next = new Set(prev)
      const opening = !next.has(m)
      opening ? next.add(m) : next.delete(m)
      // Auto-expand / collapse all chapters for this month
      if (pkg) {
        setOpenChapters((prevCh) => {
          const nextCh = new Set(prevCh)
          for (const cid of pkg.chapterIds) {
            const key = `${m}-${cid}`
            opening ? nextCh.add(key) : nextCh.delete(key)
          }
          return nextCh
        })
      }
      return next
    })
  }

  function toggleChapterOpen(key: string) {
    setOpenChapters((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

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
    setManageMonth(month)
  }

  function toggleChapterSelection(id: string) {
    setSelectedChapterIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  function toggleVisibility(id: string, val: boolean) {
    setVisibilityMap((prev) => ({ ...prev, [id]: val }))
  }

  async function handleSaveChapters() {
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
    setManageMonth(null)
    load()
  }


  async function autoSaveVideoToggle(videoId: string, val: boolean) {
    setSavingItem(videoId)
    const { error } = await supabase.from('videos')
      .update({ is_published_for_live: val } as any)
      .eq('id', videoId)
    if (error) {
      toast.error(`Save failed: ${error.message}`)
      setVideoEdits((prev) => ({
        ...prev,
        [videoId]: { ...prev[videoId]!, publishedForLive: !val },
      }))
    }
    setSavingItem(null)
  }

  async function autoSaveDocToggle(docId: string, val: boolean) {
    setSavingItem(docId)
    const { error } = await supabase.from('documents')
      .update({ is_published_for_live: val } as any)
      .eq('id', docId)
    if (error) {
      toast.error(`Save failed: ${error.message}`)
      setDocEdits((prev) => ({ ...prev, [docId]: { publishedForLive: !val } }))
    }
    setSavingItem(null)
  }

  async function autoSaveDocUrl(docId: string, urlInput: string) {
    const url = urlInput.trim() || null
    setSavingItem(docId)
    const updates: Record<string, any> = { file_url_live: url }
    // If URL is cleared, unpublish for live too
    if (!url && docEdits[docId]?.publishedForLive) {
      updates.is_published_for_live = false
      setDocEdits((prev) => ({ ...prev, [docId]: { ...prev[docId]!, publishedForLive: false } }))
    }
    const { error } = await supabase.from('documents').update(updates as any).eq('id', docId)
    if (error) toast.error(`Save failed: ${error.message}`)
    else if (url) toast.success('Live document URL saved')
    setSavingItem(null)
  }

  async function autoSaveVideoUrl(videoId: string, urlInput: string) {
    const sid = urlInput ? extractStreamableId(urlInput) : null
    const url = sid ? `https://streamable.com/e/${sid}` : (urlInput || null)
    setSavingItem(videoId)
    const updates: Record<string, any> = { streamable_url_live: url }
    // If URL is cleared, unpublish for live too
    if (!url && videoEdits[videoId]?.publishedForLive) {
      updates.is_published_for_live = false
      setVideoEdits((prev) => ({ ...prev, [videoId]: { ...prev[videoId]!, publishedForLive: false } }))
    }
    const { error } = await supabase.from('videos').update(updates as any).eq('id', videoId)
    if (error) toast.error(`Save failed: ${error.message}`)
    else if (url) toast.success('Live URL saved')
    setSavingItem(null)
  }

  async function mergeChapterUrls(chapterId: string) {
    setMergingChapter(chapterId)

    const chVideos = allVideos.filter(
      (v) => v.chapter_id === chapterId && v.streamable_url && v.streamable_url_live
    )
    const chDocs = allDocs.filter(
      (d) => d.chapter_id === chapterId && d.file_url && d.file_url_live
    )

    const errors: string[] = []

    await Promise.all([
      ...chVideos.map(async (v) => {
        const { error } = await supabase.from('videos')
          .update({ streamable_url: v.streamable_url_live } as any)
          .eq('id', v.id)
        if (error) errors.push(error.message)
        else {
          setAllVideos((prev) =>
            prev.map((x) => x.id === v.id ? { ...x, streamable_url: v.streamable_url_live } : x)
          )
        }
      }),
      ...chDocs.map(async (d) => {
        const { error } = await supabase.from('documents')
          .update({ file_url: d.file_url_live } as any)
          .eq('id', d.id)
        if (error) errors.push(error.message)
        else {
          setAllDocs((prev) =>
            prev.map((x) => x.id === d.id ? { ...x, file_url: d.file_url_live } : x)
          )
        }
      }),
    ])

    if (errors.length > 0) {
      toast.error(`Merge failed for ${errors.length} item(s)`)
    } else {
      const count = chVideos.length + chDocs.length
      toast.success(`Merged ${count} item${count !== 1 ? 's' : ''} — Video Package URL now matches Live Classes URL`)
    }

    setMergingChapter(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Live Months</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage monthly content folders for live class subscribers
          </p>
        </div>
      </div>

      {/* Grade + Year selectors */}
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
        <div className="space-y-3">
          {monthPackages.map((pkg) => {
            const isOpen = openMonths.has(pkg.month)
            const monthChapters = chapters
              .filter((ch) => pkg.chapterIds.includes(ch.id))
              .sort((a, b) => a.order_index - b.order_index)

            return (
              <div
                key={pkg.month}
                className={`rounded-xl border overflow-hidden ${
                  pkg.chapterIds.length > 0 ? 'border-primary/20' : 'border-border/60'
                }`}
              >
                {/* Month header row */}
                <div className={`flex items-center gap-3 px-4 py-3 ${
                  pkg.chapterIds.length > 0 ? 'bg-primary/5' : 'bg-card'
                }`}>
                  <button
                    onClick={() => toggleMonth(pkg.month)}
                    className="flex items-center gap-3 flex-1 text-left min-w-0"
                  >
                    <span className="font-semibold text-sm w-24 shrink-0">{MONTHS[pkg.month - 1]}</span>
                    {pkg.chapterIds.length > 0 ? (
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 shrink-0">
                        {pkg.chapterIds.length} chapter{pkg.chapterIds.length !== 1 ? 's' : ''}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">No chapters assigned</span>
                    )}
                  </button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); openManage(pkg.month) }}
                    className="shrink-0 h-7 text-xs"
                  >
                    <Settings2 className="w-3 h-3 mr-1" /> Manage
                  </Button>

                  {pkg.chapterIds.length > 0 && (
                    <button
                      onClick={() => toggleMonth(pkg.month)}
                      className="p-1 rounded hover:bg-muted/40 transition-colors shrink-0"
                    >
                      {isOpen
                        ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      }
                    </button>
                  )}
                </div>

                {/* Expanded content: chapter folders */}
                {isOpen && pkg.chapterIds.length > 0 && (
                  <div className="border-t border-border/40 divide-y divide-border/30">
                    {monthChapters.map((ch) => {
                      const chKey = `${pkg.month}-${ch.id}`
                      const isChOpen = openChapters.has(chKey)
                      const chVideos = allVideos.filter((v) => v.chapter_id === ch.id)
                      const chDocs = allDocs.filter((d) => d.chapter_id === ch.id)
                      const total = chVideos.length + chDocs.length

                      return (
                        <div key={ch.id}>
                          {(() => {
                            const mergeableVideos = chVideos.filter((v) => v.streamable_url && v.streamable_url_live)
                            const mergeableDocs = chDocs.filter((d) => d.file_url && d.file_url_live)
                            const mergeableCount = mergeableVideos.length + mergeableDocs.length
                            const isMergingThis = mergingChapter === ch.id
                            return (
                              <div className="w-full flex items-center gap-2 px-5 py-2.5 bg-muted/10 border-b border-border/20">
                                <button
                                  onClick={() => toggleChapterOpen(chKey)}
                                  className="flex items-center gap-2 flex-1 text-left min-w-0"
                                >
                                  <FolderOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span className="text-sm font-semibold truncate">{ch.title}</span>
                                  <span className="text-xs text-muted-foreground shrink-0 ml-1">
                                    {total} item{total !== 1 ? 's' : ''}
                                  </span>
                                </button>

                                {mergeableCount > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isMergingThis}
                                    onClick={() => mergeChapterUrls(ch.id)}
                                    className="shrink-0 h-7 text-xs gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/20"
                                    title={`Copy Live Classes URL → Video Package URL for ${mergeableCount} item${mergeableCount !== 1 ? 's' : ''}`}
                                  >
                                    {isMergingThis
                                      ? <Loader2 className="w-3 h-3 animate-spin" />
                                      : <GitMerge className="w-3 h-3" />
                                    }
                                    Merge URLs
                                    <span className="ml-0.5 text-[10px] opacity-70">({mergeableCount})</span>
                                  </Button>
                                )}

                                <button
                                  onClick={() => toggleChapterOpen(chKey)}
                                  className="p-1 rounded hover:bg-muted/40 transition-colors shrink-0"
                                >
                                  {isChOpen
                                    ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                                    : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                  }
                                </button>
                              </div>
                            )
                          })()}

                          {isChOpen && (
                            <div className="divide-y divide-border/20">
                              {total === 0 ? (
                                <p className="px-5 py-4 text-xs text-muted-foreground">
                                  No videos or documents in this chapter yet.
                                </p>
                              ) : (
                                <>
                                  {chVideos.map((v) => {
                                    const edit = videoEdits[v.id] ?? { url: v.streamable_url_live ?? '', publishedForLive: v.is_published_for_live }
                                    const detectedId = edit.url ? extractStreamableId(edit.url) : null
                                    // Show badge when either the DB has a URL or the current input has one
                                    const hasLiveUrl = !!(detectedId || v.streamable_url_live)
                                    const isMerged = !!(v.streamable_url && v.streamable_url_live && v.streamable_url === v.streamable_url_live)

                                    return (
                                      <div key={v.id} className="px-5 py-3 space-y-2">
                                        {/* Title row */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0 h-4 shrink-0 text-primary border-primary/30 bg-primary/5">
                                            <Video className="w-2.5 h-2.5" /> Video
                                          </Badge>
                                          <span className="font-medium text-sm flex-1 min-w-0 truncate">{v.title}</span>

                                          {isMerged && (
                                            <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-4 shrink-0 text-green-600 border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-700 dark:text-green-400">
                                              <CheckCheck className="w-2.5 h-2.5" /> Merged
                                            </Badge>
                                          )}

                                          {hasLiveUrl && (
                                            <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-4 shrink-0 text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400">
                                              <Radio className="w-2.5 h-2.5" /> Live URL ✓
                                            </Badge>
                                          )}

                                          {v.duration_minutes && (
                                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                                              <Clock className="w-2.5 h-2.5" />{v.duration_minutes}m
                                            </span>
                                          )}

                                          <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0 h-4 rounded-full shrink-0 ${v.is_published ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                                            {v.is_published ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                                            {v.is_published ? 'Published' : 'Draft'}
                                          </span>

                                          <Button variant="ghost" size="sm" asChild className="shrink-0 h-6 w-6 p-0 ml-auto">
                                            <Link href={`/admin/videos/${v.id}/edit`} title="Edit full details">
                                              <Pencil className="w-3.5 h-3.5" />
                                            </Link>
                                          </Button>
                                        </div>

                                        {/* Live URL input + publish toggle */}
                                        <div className="flex items-end gap-3 pl-0">
                                          <div className="flex-1 min-w-0">
                                            <Label className="text-[10px] text-muted-foreground mb-1 block">
                                              Live Classes URL (monthly subscription)
                                            </Label>
                                            <Input
                                              value={edit.url}
                                              onChange={(e) => setVideoEdits((prev) => ({
                                                ...prev,
                                                [v.id]: { ...prev[v.id]!, url: e.target.value },
                                              }))}
                                              onBlur={() => autoSaveVideoUrl(v.id, edit.url)}
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
                                            <Label className={`text-[10px] whitespace-nowrap ${!hasLiveUrl ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}>Published for Live</Label>
                                            <div className="flex items-center gap-1" title={!hasLiveUrl ? 'Add a live URL first' : undefined}>
                                              {savingItem === v.id
                                                ? <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                                                : edit.publishedForLive
                                                  ? <Eye className="w-3 h-3 text-primary" />
                                                  : <EyeOff className={`w-3 h-3 ${!hasLiveUrl ? 'text-muted-foreground/30' : 'text-muted-foreground'}`} />
                                              }
                                              <Switch
                                                checked={edit.publishedForLive}
                                                disabled={savingItem === v.id || !hasLiveUrl}
                                                onCheckedChange={(val) => {
                                                  setVideoEdits((prev) => ({
                                                    ...prev,
                                                    [v.id]: { ...prev[v.id]!, publishedForLive: val },
                                                  }))
                                                  autoSaveVideoToggle(v.id, val)
                                                }}
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}

                                  {chDocs.map((d) => {
                                    const edit = docEdits[d.id] ?? { url: d.file_url_live ?? '', publishedForLive: d.is_published_for_live }
                                    const hasLiveUrl = !!(edit.url || d.file_url_live)
                                    const isMerged = !!(d.file_url && d.file_url_live && d.file_url === d.file_url_live)
                                    return (
                                      <div key={d.id} className="px-5 py-3 space-y-2">
                                        {/* Title row */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0 h-4 shrink-0 text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 dark:text-orange-400">
                                            <FileText className="w-2.5 h-2.5" /> PDF
                                          </Badge>
                                          <span className="font-medium text-sm flex-1 min-w-0 truncate">{d.title}</span>

                                          {isMerged && (
                                            <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-4 shrink-0 text-green-600 border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-700 dark:text-green-400">
                                              <CheckCheck className="w-2.5 h-2.5" /> Merged
                                            </Badge>
                                          )}

                                          {hasLiveUrl && (
                                            <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-4 shrink-0 text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400">
                                              <Radio className="w-2.5 h-2.5" /> Live URL ✓
                                            </Badge>
                                          )}

                                          {d.file_name && (
                                            <span className="text-[10px] text-muted-foreground shrink-0">{d.file_name}</span>
                                          )}
                                          <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0 h-4 rounded-full shrink-0 ${d.is_published ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                                            {d.is_published ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                                            {d.is_published ? 'Published' : 'Draft'}
                                          </span>
                                          <Button variant="ghost" size="sm" asChild className="shrink-0 h-6 w-6 p-0 ml-auto">
                                            <Link href={`/admin/videos/documents/${d.id}/edit`} title="Edit full details">
                                              <Pencil className="w-3.5 h-3.5" />
                                            </Link>
                                          </Button>
                                        </div>

                                        {/* Live URL input + publish toggle */}
                                        <div className="flex items-end gap-3">
                                          <div className="flex-1 min-w-0">
                                            <Label className="text-[10px] text-muted-foreground mb-1 block">
                                              Live Classes Document URL (monthly subscription)
                                            </Label>
                                            <Input
                                              value={edit.url}
                                              onChange={(e) => setDocEdits((prev) => ({
                                                ...prev,
                                                [d.id]: { ...prev[d.id]!, url: e.target.value },
                                              }))}
                                              onBlur={() => autoSaveDocUrl(d.id, edit.url)}
                                              placeholder="https://drive.google.com/…"
                                              className="text-xs h-8 font-mono"
                                            />
                                          </div>
                                          <div className="shrink-0 flex flex-col items-center gap-1 pb-0.5">
                                            <Label className={`text-[10px] whitespace-nowrap ${!hasLiveUrl ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}>Published for Live</Label>
                                            <div className="flex items-center gap-1" title={!hasLiveUrl ? 'Add a live URL first' : undefined}>
                                              {savingItem === d.id
                                                ? <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                                                : edit.publishedForLive
                                                  ? <Eye className="w-3 h-3 text-primary" />
                                                  : <EyeOff className={`w-3 h-3 ${!hasLiveUrl ? 'text-muted-foreground/30' : 'text-muted-foreground'}`} />
                                              }
                                              <Switch
                                                checked={edit.publishedForLive}
                                                disabled={savingItem === d.id || !hasLiveUrl}
                                                onCheckedChange={(val) => {
                                                  setDocEdits((prev) => ({
                                                    ...prev,
                                                    [d.id]: { ...prev[d.id]!, publishedForLive: val },
                                                  }))
                                                  autoSaveDocToggle(d.id, val)
                                                }}
                                              />
                                            </div>
                                          </div>
                                        </div>
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
            )
          })}
        </div>
      )}

      {/* Manage modal — chapter assignment only, no tabs */}
      <Dialog open={manageMonth != null} onOpenChange={(open) => { if (!open) setManageMonth(null) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {manageMonth != null ? `Manage — ${MONTHS[manageMonth - 1]} ${selectedYear}` : ''}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Chapter assignment */}
            <div>
              <p className="text-sm font-medium mb-1">Assign chapters to this month</p>
              <p className="text-xs text-muted-foreground mb-2">
                Chapters already assigned to other months are hidden.
              </p>
              {dialogChapters.length === 0 ? (
                <p className="text-xs text-muted-foreground">No chapters available for this grade.</p>
              ) : (
                <div className="rounded-lg border border-border/60 divide-y divide-border/40 max-h-56 overflow-y-auto">
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

            {/* Chapter visibility */}
            {dialogChapters.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Chapter visibility for subscribers</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Toggle which chapters are visible to live-class subscribers.
                </p>
                <div className="rounded-lg border border-border/60 divide-y divide-border/40 max-h-44 overflow-y-auto">
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
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setManageMonth(null)}>Cancel</Button>
            <Button
              onClick={handleSaveChapters}
              disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-accent"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Chapters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

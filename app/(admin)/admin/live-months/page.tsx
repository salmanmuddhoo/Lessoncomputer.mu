'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, CalendarDays, Settings2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

interface Grade {
  id: string
  name: string
  color: string
}

interface Chapter {
  id: string
  title: string
  order_index: number
  is_visible_to_subscribers: boolean
}

interface MonthPackage {
  id: string | null
  month: number
  year: number
  chapterIds: string[]
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
    const initVisibility: Record<string, boolean> = {}
    for (const ch of chapters) {
      initVisibility[ch.id] = ch.is_visible_to_subscribers
    }
    setDialogChapters(chapters)
    setSelectedChapterIds(initSelected)
    setVisibilityMap(initVisibility)
    setManageMonth(month)
  }

  function toggleChapter(id: string) {
    setSelectedChapterIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  function toggleVisibility(id: string, val: boolean) {
    setVisibilityMap((prev) => ({ ...prev, [id]: val }))
  }

  async function handleSave() {
    if (manageMonth == null || !selectedGradeId) return
    setSaving(true)

    const monthName = MONTHS[manageMonth - 1]
    const name = `${monthName} ${selectedYear}`
    const pkg = monthPackages.find((p) => p.month === manageMonth)

    let pkgId = pkg?.id ?? null

    if (pkgId) {
      const { error } = await supabase.from('subscription_packages')
        .update({ name })
        .eq('id', pkgId)
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
    setManageMonth(null)
    setSaving(false)
    load()
  }

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
                  <Badge variant="outline" className="text-xs">
                    {pkg.chapterIds.length} ch
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {pkg.chapterIds.length === 0
                  ? 'No chapters assigned'
                  : `${pkg.chapterIds.length} chapter${pkg.chapterIds.length !== 1 ? 's' : ''} assigned`
                }
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openManage(pkg.month)}
                className="w-full"
              >
                <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                Manage
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={manageMonth != null} onOpenChange={(open) => { if (!open) setManageMonth(null) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {manageMonth != null ? `${MONTHS[manageMonth - 1]} ${selectedYear}` : ''}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm font-medium mb-2">Assign chapters to this month</p>
              {dialogChapters.length === 0 ? (
                <p className="text-xs text-muted-foreground">No chapters for this grade.</p>
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
                        onChange={() => toggleChapter(ch.id)}
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
              {dialogChapters.length === 0 ? null : (
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setManageMonth(null)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-accent"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

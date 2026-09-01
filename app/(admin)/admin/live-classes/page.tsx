'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LiveClassSchedule } from '@/components/lc/live-class-schedule'
import { LiveClassCalendar } from '@/components/lc/live-class-calendar'
import { Plus, Pencil, Calendar, Package, Filter, Video, List, CalendarDays, Archive, Folder, FolderOpen, ChevronDown, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { nextOccurrence } from '@/lib/live-class-occurrences'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

interface LiveClass {
  id: string
  title: string
  scheduled_at: string
  meet_url?: string | null
  is_published: boolean
  is_archived?: boolean
  is_recurring?: boolean
  recurrence_day_of_week?: number | null
  end_time?: string | null
  grade: { name: string; color: string; id: string } | null
  package: { id: string; name: string; month: number; year: number } | null
}

export default function AdminLiveClassesPage() {
  const [classes, setClasses] = useState<LiveClass[]>([])
  const [loading, setLoading] = useState(true)
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [openArchive, setOpenArchive] = useState<Set<string>>(new Set())

  function toggleArchive(gradeId: string) {
    setOpenArchive((prev) => {
      const next = new Set(prev)
      next.has(gradeId) ? next.delete(gradeId) : next.add(gradeId)
      return next
    })
  }

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('live_classes')
        .select('*, grade:grades(id, name, color), package:subscription_packages(id, name, month, year)')
        .order('scheduled_at', { ascending: false })
      setClasses((data as any) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // The next upcoming published class (across all grades) that has a meeting link.
  const nextUp = useMemo(() => {
    const from = new Date()
    let best: { cls: LiveClass; start: Date } | null = null
    for (const c of classes) {
      if (!c.is_published || !c.meet_url) continue
      const start = nextOccurrence(c, from)
      if (start && (!best || start < best.start)) best = { cls: c, start }
    }
    return best
  }, [classes])

  const grades = Array.from(
    new Map(
      classes
        .map((c) => c.grade)
        .filter(Boolean)
        .map((g) => [g!.id, g!])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name))

  const filtered = gradeFilter === 'all'
    ? classes
    : classes.filter((c) => c.grade?.id === gradeFilter)

  // Split into active classes (shown normally) and archived classes, which live in a
  // per-grade "Archived" folder so the main list stays short as months accumulate.
  const activeClasses = filtered.filter((c) => !c.is_archived)
  const archivedClasses = filtered.filter((c) => c.is_archived)
  const archivedByGrade = Array.from(
    archivedClasses.reduce((map, c) => {
      const g = c.grade ?? { id: '__none__', name: 'Unknown', color: '#888888' }
      if (!map.has(g.id)) map.set(g.id, { grade: g, items: [] as LiveClass[] })
      map.get(g.id)!.items.push(c)
      return map
    }, new Map<string, { grade: { id: string; name: string; color: string }; items: LiveClass[] }>()).values()
  ).sort((a, b) => a.grade.name.localeCompare(b.grade.name))

  // Status of a class, mirroring the per-row badge logic, so the header counts are accurate
  // (e.g. only current-month published classes are "Active", not every non-archived one).
  function statusOf(c: LiveClass): 'archived' | 'draft' | 'ended' | 'active' | 'upcoming' {
    if (c.is_archived) return 'archived'
    if (!c.is_published) return 'draft'
    const d = new Date(c.scheduled_at)
    const m = d.getMonth() + 1, y = d.getFullYear()
    if (y < currentYear || (y === currentYear && m < currentMonth)) return 'ended'
    if (y === currentYear && m === currentMonth) return 'active'
    return 'upcoming'
  }
  const counts = { active: 0, upcoming: 0, ended: 0, archived: 0, draft: 0 }
  for (const c of filtered) counts[statusOf(c)]++

  const summary: { label: string; value: number; className: string }[] = [
    { label: 'Active', value: counts.active, className: 'bg-primary/10 text-primary' },
    { label: 'Upcoming', value: counts.upcoming, className: 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400' },
    { label: 'Ended', value: counts.ended, className: 'bg-muted text-muted-foreground' },
    { label: 'Archived', value: counts.archived, className: 'bg-muted text-muted-foreground' },
    ...(counts.draft > 0 ? [{ label: 'Draft', value: counts.draft, className: 'bg-secondary text-muted-foreground' }] : []),
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Live Classes</h1>
        <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-accent">
          <Link href="/admin/live-classes/new">
            <Plus className="w-4 h-4 mr-1" /> Schedule Class
          </Link>
        </Button>
      </div>

      {/* Status summary */}
      <div className="flex flex-wrap gap-2 mb-6">
        {summary.map((s) => (
          <div key={s.label} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${s.className}`}>
            <span className="font-bold">{s.value}</span> {s.label}
          </div>
        ))}
      </div>

      {/* Join next upcoming class */}
      {nextUp && (
        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Video className="w-4 h-4 text-primary" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-primary uppercase tracking-wide">Next live class</p>
              <p className="font-semibold text-sm truncate">{nextUp.cls.title}</p>
              <p className="text-xs text-muted-foreground">
                {nextUp.cls.grade ? `${nextUp.cls.grade.name} · ` : ''}{format(nextUp.start, 'EEE d MMM, HH:mm')}
              </p>
            </div>
          </div>
          <Button
            onClick={() => window.open(nextUp.cls.meet_url!, '_blank', 'noopener,noreferrer')}
            className="bg-primary text-primary-foreground hover:bg-accent shrink-0"
          >
            <Video className="w-4 h-4 mr-2" /> Join class
          </Button>
        </div>
      )}

      {/* Grade filter + view toggle */}
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {grades.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border/60 p-0.5">
          <button
            onClick={() => setView('list')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/40'}`}
          >
            <List className="w-3.5 h-3.5" /> List
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${view === 'calendar' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/40'}`}
          >
            <CalendarDays className="w-3.5 h-3.5" /> Calendar
          </button>
        </div>
      </div>

      {view === 'calendar' ? (
        loading ? (
          <div className="py-16 text-center text-muted-foreground text-sm rounded-xl border border-border/60">Loading…</div>
        ) : (
          <LiveClassCalendar classes={activeClasses as any} />
        )
      ) : (
      <div className="space-y-6">
      <div className="rounded-xl border border-border/60 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div>
        ) : activeClasses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-muted/30 border-b border-border/60">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Grade</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Package</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Scheduled</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {activeClasses.map((c) => {
                  const grade = c.grade
                  const pkg = c.package
                  const d = new Date(c.scheduled_at)
                  const classMonth = d.getMonth() + 1
                  const classYear = d.getFullYear()
                  const isCurrentMonth = classMonth === currentMonth && classYear === currentYear
                  const isPastMonth = classYear < currentYear || (classYear === currentYear && classMonth < currentMonth)
                  return (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium line-clamp-1 max-w-[180px] block">{c.title}</span>
                      </td>
                      <td className="px-4 py-3">
                        {grade && (
                          <Badge
                            variant="outline"
                            style={{ borderColor: `${grade.color}40`, color: grade.color }}
                          >
                            {grade.name}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {pkg ? (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Package className="w-3 h-3 shrink-0" />
                            {pkg.name} — {MONTHS[pkg.month - 1]} {pkg.year}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        <span className="flex items-start gap-1">
                          <Calendar className="w-3 h-3 mt-0.5 shrink-0" />
                          <LiveClassSchedule
                            scheduledAt={c.scheduled_at}
                            isRecurring={c.is_recurring ?? false}
                            recurrenceDayOfWeek={c.recurrence_day_of_week ?? null}
                            endTime={c.end_time ?? null}
                          />
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {c.is_archived ? (
                          <span className="inline-flex text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Archived</span>
                        ) : (
                          <span className={`inline-flex text-xs px-2 py-0.5 rounded-full ${
                            !c.is_published
                              ? 'bg-secondary text-muted-foreground'
                              : isPastMonth
                              ? 'bg-muted text-muted-foreground'
                              : isCurrentMonth
                              ? 'bg-primary/10 text-primary'
                              : 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400'
                          }`}>
                            {!c.is_published ? 'Draft' : isPastMonth ? 'Ended' : isCurrentMonth ? 'Active' : 'Upcoming'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/live-classes/${c.id}/edit`}>
                            <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="text-muted-foreground mb-4">
              {gradeFilter === 'all' ? 'No live classes scheduled yet.' : 'No classes for this grade.'}
            </p>
            {gradeFilter === 'all' && (
              <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-accent">
                <Link href="/admin/live-classes/new">
                  <Plus className="w-4 h-4 mr-1" /> Schedule First Class
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Archived — one collapsible folder per grade */}
      {!loading && archivedClasses.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Archive className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground">Archived</h2>
            <span className="text-xs text-muted-foreground">({archivedClasses.length})</span>
          </div>
          <div className="space-y-2">
            {archivedByGrade.map(({ grade, items }) => {
              const open = openArchive.has(grade.id)
              return (
                <div key={grade.id} className="rounded-xl border border-border/60 overflow-hidden">
                  <button
                    onClick={() => toggleArchive(grade.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                  >
                    {open
                      ? <FolderOpen className="w-4 h-4 shrink-0" style={{ color: grade.color }} />
                      : <Folder className="w-4 h-4 shrink-0" style={{ color: grade.color }} />}
                    <Badge variant="outline" style={{ borderColor: `${grade.color}40`, color: grade.color }}>{grade.name}</Badge>
                    <span className="ml-auto text-xs text-muted-foreground">{items.length} archived class{items.length !== 1 ? 'es' : ''}</span>
                    {open
                      ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </button>
                  {open && (
                    <div className="border-t border-border/40 divide-y divide-border/30">
                      {items.map((c) => (
                        <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                          <span className="font-medium text-sm flex-1 line-clamp-1 min-w-0">{c.title}</span>
                          <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1 shrink-0">
                            <Calendar className="w-3 h-3" />
                            <LiveClassSchedule
                              scheduledAt={c.scheduled_at}
                              isRecurring={c.is_recurring ?? false}
                              recurrenceDayOfWeek={c.recurrence_day_of_week ?? null}
                              endTime={c.end_time ?? null}
                            />
                          </span>
                          <Button variant="ghost" size="sm" asChild className="shrink-0">
                            <Link href={`/admin/live-classes/${c.id}/edit`}><Pencil className="w-3.5 h-3.5 mr-1" /> Edit</Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
      </div>
      )}
    </div>
  )
}

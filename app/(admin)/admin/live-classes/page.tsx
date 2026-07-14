'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LiveClassSchedule } from '@/components/lc/live-class-schedule'
import { LiveClassCalendar } from '@/components/lc/live-class-calendar'
import { Plus, Pencil, Calendar, Package, Filter, Video, List, CalendarDays } from 'lucide-react'
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Live Classes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{filtered.length} of {classes.length} classes</p>
        </div>
        <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-accent">
          <Link href="/admin/live-classes/new">
            <Plus className="w-4 h-4 mr-1" /> Schedule Class
          </Link>
        </Button>
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
                {nextUp.cls.grade ? `${nextUp.cls.grade.name} · ` : ''}{format(nextUp.start, 'EEE d MMM, h:mm a')}
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
          <LiveClassCalendar classes={filtered as any} />
        )
      ) : (
      <div className="rounded-xl border border-border/60 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div>
        ) : filtered.length > 0 ? (
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
                {filtered.map((c) => {
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
      )}
    </div>
  )
}

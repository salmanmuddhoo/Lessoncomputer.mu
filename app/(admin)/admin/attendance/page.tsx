'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2, ClipboardList, Users, ChevronDown, ChevronUp, RefreshCw, Radio } from 'lucide-react'
import { toast } from 'sonner'

interface Grade { id: string; name: string; color: string }
interface LiveClass {
  id: string
  title: string
  grade_id: string
  scheduled_at: string
  is_published: boolean
  attendance_open: boolean
  is_recurring: boolean
  recurrence_day_of_week: number | null
  grade: { name: string; color: string } | null
}
interface AttendeeRow {
  id: string
  student_id: string
  entry_time: string
  scheduled_end_time: string | null
  profile: { full_name: string | null } | null
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { timeStyle: 'short' })
}

/** Returns true if the class has started (based on scheduled time and recurrence). */
function hasStarted(cls: LiveClass): boolean {
  const now = new Date()
  const scheduled = new Date(cls.scheduled_at)

  if (!cls.is_recurring || cls.recurrence_day_of_week === null) {
    return scheduled <= now
  }

  // Recurring: check if today is the correct day AND time has passed
  const today = now.getDay()
  if (today !== cls.recurrence_day_of_week) return false

  const todayOccurrence = new Date(now)
  todayOccurrence.setHours(scheduled.getHours(), scheduled.getMinutes(), 0, 0)
  return now >= todayOccurrence
}

export default function AdminAttendancePage() {
  const [grades, setGrades] = useState<Grade[]>([])
  const [classes, setClasses] = useState<LiveClass[]>([])
  const [markCounts, setMarkCounts] = useState<Record<string, number>>({})
  const [gradeFilter, setGradeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<AttendeeRow[]>([])
  const [expandLoading, setExpandLoading] = useState(false)
  const [now, setNow] = useState(() => new Date())

  const supabase = createClient()

  // Refresh "now" every minute so button disabled state stays accurate
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const load = useCallback(async (gid?: string) => {
    const currentDate = new Date()
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString()
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1).toISOString()

    const [{ data: gData }, { data: cData }] = await Promise.all([
      supabase.from('grades').select('id, name, color').eq('is_active', true).order('order_index'),
      gid
        ? (supabase as any)
            .from('live_classes')
            .select('id, title, grade_id, scheduled_at, is_published, attendance_open, is_recurring, recurrence_day_of_week, grade:grades(name, color)')
            .eq('grade_id', gid)
            .eq('is_published', true)
            .gte('scheduled_at', monthStart)
            .lt('scheduled_at', monthEnd)
            .order('scheduled_at', { ascending: true })
        : (supabase as any)
            .from('live_classes')
            .select('id, title, grade_id, scheduled_at, is_published, attendance_open, is_recurring, recurrence_day_of_week, grade:grades(name, color)')
            .eq('is_published', true)
            .gte('scheduled_at', monthStart)
            .lt('scheduled_at', monthEnd)
            .order('scheduled_at', { ascending: true }),
    ])
    setGrades((gData ?? []) as Grade[])
    const cs = (cData ?? []) as LiveClass[]
    setClasses(cs)

    if (cs.length > 0) {
      const ids = cs.map((c) => c.id)
      const { data: marks } = await (supabase as any)
        .from('live_attendance')
        .select('live_class_id')
        .in('live_class_id', ids)
        .not('scheduled_end_time', 'is', null)
      const counts: Record<string, number> = {}
      for (const row of (marks ?? []) as any[]) {
        counts[row.live_class_id] = (counts[row.live_class_id] ?? 0) + 1
      }
      setMarkCounts(counts)
    }
    setLoading(false)
  }, [gradeFilter])

  useEffect(() => { load(gradeFilter || undefined) }, [gradeFilter])

  async function toggleAttendance(cls: LiveClass) {
    setTogglingId(cls.id)
    const next = !cls.attendance_open
    const { error } = await (supabase as any)
      .from('live_classes')
      .update({ attendance_open: next })
      .eq('id', cls.id)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(next ? 'Attendance opened — students can now mark present' : 'Attendance closed')
      setClasses((prev) => prev.map((c) => c.id === cls.id ? { ...c, attendance_open: next } : c))
    }
    setTogglingId(null)
  }

  async function handleExpand(classId: string) {
    if (expandedId === classId) { setExpandedId(null); return }
    setExpandedId(classId)
    setExpandLoading(true)
    const { data } = await (supabase as any)
      .from('live_attendance')
      .select('id, student_id, entry_time, scheduled_end_time, profile:profiles(full_name)')
      .eq('live_class_id', classId)
      .order('entry_time', { ascending: true })
    setExpandedRows((data ?? []) as AttendeeRow[])
    setExpandLoading(false)
  }

  const openCount = classes.filter((c) => c.attendance_open).length

  // Group by grade for display when no grade filter
  const grouped: Array<{ key: string; label: string; items: LiveClass[] }> = []
  const seenKeys = new Set<string>()
  for (const cls of classes) {
    const gradeKey = cls.grade_id
    if (!seenKeys.has(gradeKey)) {
      seenKeys.add(gradeKey)
      grouped.push({ key: gradeKey, label: cls.grade?.name ?? 'Unknown Grade', items: [] })
    }
    grouped[grouped.length - 1].items.push(cls)
  }

  const currentMonthLabel = `${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}`

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Open attendance on a live class so students can mark present · <span className="font-medium">{currentMonthLabel}</span>
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => load(gradeFilter || undefined)}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {openCount > 0 && (
        <div className="mb-6 rounded-xl border-2 border-green-500/40 bg-green-50 dark:bg-green-950/20 px-5 py-3 flex items-center gap-3">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
          <p className="text-sm font-semibold text-green-700 dark:text-green-400">
            {openCount} class{openCount !== 1 ? 'es have' : ' has'} attendance open right now
          </p>
        </div>
      )}

      <div className="mb-6">
        <Select value={gradeFilter || 'all'} onValueChange={(v) => setGradeFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Grades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {grades.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : classes.length === 0 ? (
        <div className="py-20 text-center rounded-xl border border-border/60">
          <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No live classes scheduled for {currentMonthLabel}.</p>
          <p className="text-xs text-muted-foreground mt-1">Schedule and publish live classes to manage attendance.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <div key={group.key}>
              {!gradeFilter && (
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5" /> {group.label}
                </h2>
              )}
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead className="bg-muted/30 border-b border-border/60">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Class</th>
                        {!gradeFilter && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Grade</th>}
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Scheduled</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Present</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Attendance</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {group.items.map((cls) => {
                        const grade = cls.grade
                        const count = markCounts[cls.id] ?? 0
                        const isExpanded = expandedId === cls.id
                        const isToggling = togglingId === cls.id
                        const started = hasStarted(cls)
                        return (
                          <>
                            <tr
                              key={cls.id}
                              className={cls.attendance_open
                                ? 'bg-green-50/50 dark:bg-green-950/10 hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors'
                                : 'hover:bg-muted/20 transition-colors'}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {cls.attendance_open && (
                                    <span className="relative flex h-2 w-2 shrink-0">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                                    </span>
                                  )}
                                  <span className="font-medium">{cls.title}</span>
                                  {cls.is_recurring && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">Weekly</Badge>
                                  )}
                                </div>
                              </td>
                              {!gradeFilter && (
                                <td className="px-4 py-3">
                                  {grade && (
                                    <Badge variant="outline" style={{ borderColor: `${grade.color}40`, color: grade.color, backgroundColor: `${grade.color}10` }}>
                                      {grade.name}
                                    </Badge>
                                  )}
                                </td>
                              )}
                              <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                                {fmt(cls.scheduled_at)}
                              </td>
                              <td className="px-4 py-3">
                                <span className="flex items-center gap-1 font-medium text-sm">
                                  <Users className="w-3.5 h-3.5 text-primary" />
                                  {count}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {!started && !cls.attendance_open ? (
                                  <span className="text-xs text-muted-foreground italic">Not started yet</span>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant={cls.attendance_open ? 'default' : 'outline'}
                                    className={cls.attendance_open
                                      ? 'bg-green-600 hover:bg-green-700 text-white h-7 text-xs'
                                      : 'h-7 text-xs'}
                                    disabled={isToggling}
                                    onClick={() => toggleAttendance(cls)}
                                  >
                                    {isToggling && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                                    {cls.attendance_open ? 'Close' : 'Open Attendance'}
                                  </Button>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => handleExpand(cls.id)}
                                >
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  {isExpanded ? 'Hide' : 'View'}
                                </Button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr key={`${cls.id}-exp`}>
                                <td colSpan={gradeFilter ? 5 : 6} className="px-4 pb-4 pt-2 bg-muted/10">
                                  {expandLoading ? (
                                    <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                                  ) : expandedRows.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-3">No attendance records yet.</p>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs min-w-[400px]">
                                        <thead>
                                          <tr className="text-muted-foreground">
                                            <th className="text-left pb-1 font-medium">Student</th>
                                            <th className="text-left pb-1 font-medium">Joined at</th>
                                            <th className="text-left pb-1 font-medium">Marked present at</th>
                                            <th className="text-left pb-1 font-medium">Status</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/20">
                                          {expandedRows.map((row) => (
                                            <tr key={row.id}>
                                              <td className="py-1.5 font-medium pr-4">{row.profile?.full_name ?? 'Unknown'}</td>
                                              <td className="py-1.5 text-muted-foreground pr-4">{fmtTime(row.entry_time)}</td>
                                              <td className="py-1.5 text-muted-foreground pr-4">
                                                {row.scheduled_end_time ? fmtTime(row.scheduled_end_time) : '—'}
                                              </td>
                                              <td className="py-1.5">
                                                {row.scheduled_end_time
                                                  ? <span className="text-green-600 dark:text-green-400 font-semibold">Present</span>
                                                  : <span className="text-orange-500 font-semibold">Joined only</span>}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

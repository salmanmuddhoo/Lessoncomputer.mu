'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2, ClipboardList, Users, ChevronDown, ChevronUp, RefreshCw, Radio, Check, X, UserPlus } from 'lucide-react'
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

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

// Timestamps are stored as UTC; always render them in Mauritius time so the displayed time
// matches the local clock regardless of the admin's browser/server timezone.
function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Indian/Mauritius' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { timeStyle: 'short', timeZone: 'Indian/Mauritius' })
}

export default function AdminAttendancePage() {
  const nowD = new Date()
  const [grades, setGrades] = useState<Grade[]>([])
  const [classes, setClasses] = useState<LiveClass[]>([])
  const [markCounts, setMarkCounts] = useState<Record<string, number>>({})
  const [gradeFilter, setGradeFilter] = useState('')
  const [month, setMonth] = useState(nowD.getMonth() + 1) // 1–12
  const [year, setYear] = useState(nowD.getFullYear())
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<AttendeeRow[]>([])
  const [expandLoading, setExpandLoading] = useState(false)
  const [savingMark, setSavingMark] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<{ id: string; full_name: string | null }[]>([])
  const [addSelect, setAddSelect] = useState('')

  const supabase = createClient()

  const yearOptions = [nowD.getFullYear() - 1, nowD.getFullYear(), nowD.getFullYear() + 1]
  if (!yearOptions.includes(year)) yearOptions.push(year)

  const load = useCallback(async (gid: string, m: number, y: number) => {
    setLoading(true)
    const monthStart = new Date(y, m - 1, 1).toISOString()
    const monthEnd = new Date(y, m, 1).toISOString()

    let q = (supabase as any)
      .from('live_classes')
      .select('id, title, grade_id, scheduled_at, is_published, attendance_open, is_recurring, recurrence_day_of_week, grade:grades(name, color)')
      .eq('is_published', true)
      .gte('scheduled_at', monthStart)
      .lt('scheduled_at', monthEnd)
      .order('scheduled_at', { ascending: true })
    if (gid) q = q.eq('grade_id', gid)

    const [{ data: gData }, { data: cData }] = await Promise.all([
      supabase.from('grades').select('id, name, color').eq('is_active', true).order('order_index'),
      q,
    ])
    setGrades((gData ?? []) as Grade[])
    const cs = (cData ?? []) as LiveClass[]
    setClasses(cs)
    // Collapse any open detail when the filter changes.
    setExpandedId(null)

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
    } else {
      setMarkCounts({})
    }
    setLoading(false)
  }, [])

  useEffect(() => { load(gradeFilter, month, year) }, [gradeFilter, month, year, load])

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

  async function handleExpand(cls: LiveClass) {
    if (expandedId === cls.id) { setExpandedId(null); return }
    setExpandedId(cls.id)
    setExpandLoading(true)
    setAddSelect('')
    // live_attendance.student_id references auth.users, not profiles, so PostgREST can't embed
    // profiles directly — fetch the rows, then resolve student names in a second query.
    const { data } = await (supabase as any)
      .from('live_attendance')
      .select('id, student_id, entry_time, scheduled_end_time')
      .eq('live_class_id', cls.id)
      .order('entry_time', { ascending: true })
    const rows = (data ?? []) as any[]
    const already = new Set(rows.map((r) => r.student_id))

    // Candidate students to add manually: everyone with an active live subscription for this
    // class's grade who isn't already in the attendance list.
    const { data: subRows } = await (supabase as any)
      .from('student_subscriptions')
      .select('student_id, package:subscription_packages!inner(grade_id, package_type)')
      .eq('status', 'active')
      .eq('package.package_type', 'live_month')
      .eq('package.grade_id', cls.grade_id)
    const candIds = [...new Set(((subRows ?? []) as any[]).map((s) => s.student_id))].filter((id) => !already.has(id))

    const nameById = new Map<string, string | null>()
    const allIds = [...new Set([...rows.map((r) => r.student_id), ...candIds])]
    if (allIds.length > 0) {
      const { data: profiles } = await (supabase as any)
        .from('profiles').select('id, full_name').in('id', allIds)
      for (const p of (profiles ?? []) as Array<{ id: string; full_name: string | null }>) nameById.set(p.id, p.full_name)
    }
    setExpandedRows(rows.map((r) => ({ ...r, profile: { full_name: nameById.get(r.student_id) ?? null } })) as AttendeeRow[])
    setCandidates(candIds.map((id) => ({ id, full_name: nameById.get(id) ?? null }))
      .sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? '')))
    setExpandLoading(false)
  }

  // Correct a student's attendance: mark them present (set the present timestamp) or undo it.
  async function togglePresent(classId: string, row: AttendeeRow) {
    const makePresent = !row.scheduled_end_time
    setSavingMark(row.id)
    const val = makePresent ? new Date().toISOString() : null
    const { error } = await (supabase as any)
      .from('live_attendance')
      .update({ scheduled_end_time: val })
      .eq('id', row.id)
    if (error) {
      toast.error(error.message)
    } else {
      setExpandedRows((prev) => prev.map((r) => r.id === row.id ? { ...r, scheduled_end_time: val } : r))
      setMarkCounts((prev) => ({ ...prev, [classId]: Math.max(0, (prev[classId] ?? 0) + (makePresent ? 1 : -1)) }))
      toast.success(makePresent ? 'Marked present' : 'Marked not present')
    }
    setSavingMark(null)
  }

  // Add a student who attended but has no record (e.g. couldn't join to mark themselves).
  async function addPresent(cls: LiveClass, studentId: string) {
    setSavingMark(studentId)
    const nowIso = new Date().toISOString()
    const { data, error } = await (supabase as any)
      .from('live_attendance')
      .insert({ live_class_id: cls.id, student_id: studentId, grade_id: cls.grade_id, entry_time: nowIso, scheduled_end_time: nowIso })
      .select('id, student_id, entry_time, scheduled_end_time')
      .single()
    if (error || !data) {
      toast.error(error?.message ?? 'Could not add the student.')
    } else {
      const name = candidates.find((c) => c.id === studentId)?.full_name ?? null
      setExpandedRows((prev) => [...prev, { ...data, profile: { full_name: name } } as AttendeeRow])
      setCandidates((prev) => prev.filter((c) => c.id !== studentId))
      setMarkCounts((prev) => ({ ...prev, [cls.id]: (prev[cls.id] ?? 0) + 1 }))
      setAddSelect('')
      toast.success('Student added as present')
    }
    setSavingMark(null)
  }

  const openCount = classes.filter((c) => c.attendance_open).length
  const isPastMonth = year < nowD.getFullYear() || (year === nowD.getFullYear() && month < nowD.getMonth() + 1)

  // Group by grade for display when no grade filter
  const grouped: Array<{ key: string; label: string; items: LiveClass[] }> = []
  const seenKeys = new Set<string>()
  for (const cls of classes) {
    if (!seenKeys.has(cls.grade_id)) {
      seenKeys.add(cls.grade_id)
      grouped.push({ key: cls.grade_id, label: cls.grade?.name ?? 'Unknown Grade', items: [] })
    }
    grouped[grouped.length - 1].items.push(cls)
  }

  const monthLabel = `${MONTHS[month - 1]} ${year}`

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Open attendance so students can mark present, or correct records after a class · <span className="font-medium">{monthLabel}</span>
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => load(gradeFilter, month, year)}>
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

      {/* Filters: grade + month + year */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Select value={gradeFilter || 'all'} onValueChange={(v) => setGradeFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Grades" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {grades.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((label, i) => <SelectItem key={i} value={String(i + 1)}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
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
          <p className="text-muted-foreground">No live classes scheduled for {monthLabel}.</p>
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
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => handleExpand(cls)}
                                >
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  {isExpanded ? 'Hide' : 'View / Edit'}
                                </Button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr key={`${cls.id}-exp`}>
                                <td colSpan={gradeFilter ? 5 : 6} className="px-4 pb-4 pt-2 bg-muted/10">
                                  {expandLoading ? (
                                    <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                                  ) : (
                                    <>
                                      {expandedRows.length === 0 ? (
                                        <p className="text-sm text-muted-foreground py-3">No attendance records yet — add students below.</p>
                                      ) : (
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-xs min-w-[460px]">
                                            <thead>
                                              <tr className="text-muted-foreground">
                                                <th className="text-left pb-1 font-medium">Student</th>
                                                <th className="text-left pb-1 font-medium">Joined at</th>
                                                <th className="text-left pb-1 font-medium">Marked present at</th>
                                                <th className="text-left pb-1 font-medium">Status</th>
                                                <th className="text-right pb-1 font-medium">Correct</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/20">
                                              {expandedRows.map((row) => {
                                                const present = !!row.scheduled_end_time
                                                return (
                                                  <tr key={row.id}>
                                                    <td className="py-1.5 font-medium pr-4">{row.profile?.full_name ?? 'Unknown'}</td>
                                                    <td className="py-1.5 text-muted-foreground pr-4">{fmtTime(row.entry_time)}</td>
                                                    <td className="py-1.5 text-muted-foreground pr-4">{present ? fmtTime(row.scheduled_end_time!) : '—'}</td>
                                                    <td className="py-1.5">
                                                      {present
                                                        ? <span className="text-green-600 dark:text-green-400 font-semibold">Present</span>
                                                        : <span className="text-orange-500 font-semibold">Joined only</span>}
                                                    </td>
                                                    <td className="py-1.5 text-right">
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className={`h-6 text-[11px] gap-1 ${present ? 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20' : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20'}`}
                                                        disabled={savingMark === row.id}
                                                        onClick={() => togglePresent(cls.id, row)}
                                                      >
                                                        {savingMark === row.id
                                                          ? <Loader2 className="w-3 h-3 animate-spin" />
                                                          : present ? <X className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                                                        {present ? 'Unmark' : 'Mark present'}
                                                      </Button>
                                                    </td>
                                                  </tr>
                                                )
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}

                                      {/* Add a student who attended but has no record */}
                                      {candidates.length > 0 && (
                                        <div className="mt-3 flex items-center gap-2 flex-wrap border-t border-border/30 pt-3">
                                          <span className="text-[11px] text-muted-foreground">Add a student who attended:</span>
                                          <Select value={addSelect} onValueChange={setAddSelect}>
                                            <SelectTrigger className="w-56 h-7 text-xs"><SelectValue placeholder="Select a student" /></SelectTrigger>
                                            <SelectContent>
                                              {candidates.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name ?? 'Unnamed'}</SelectItem>)}
                                            </SelectContent>
                                          </Select>
                                          <Button
                                            size="sm"
                                            className="h-7 text-xs bg-primary text-primary-foreground hover:bg-accent"
                                            disabled={!addSelect || savingMark === addSelect}
                                            onClick={() => addSelect && addPresent(cls, addSelect)}
                                          >
                                            {savingMark === addSelect ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <UserPlus className="w-3 h-3 mr-1" />}
                                            Add present
                                          </Button>
                                        </div>
                                      )}
                                      {isPastMonth && (
                                        <p className="text-[11px] text-muted-foreground mt-2">
                                          You&apos;re editing a past month — corrections here update the student&apos;s attendance record.
                                        </p>
                                      )}
                                    </>
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

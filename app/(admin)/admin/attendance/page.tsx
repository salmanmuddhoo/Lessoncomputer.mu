'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2, ClipboardList, Users, ChevronDown, ChevronUp, RefreshCw, Radio, Check, X, UserPlus, Folder, FolderOpen } from 'lucide-react'
import { toast } from 'sonner'
import { occurrencesInMonth, currentOccurrenceDate, formatOccurrenceDate } from '@/lib/attendance-occurrence'

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
  is_absent: boolean
  profile: { full_name: string | null } | null
}
// One real weekly session of a class within the selected month — a recurring class expands
// into one Session per occurrence date; a one-off class has exactly one.
interface Session {
  key: string
  cls: LiveClass
  occurrenceDate: string
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

// Timestamps are stored as UTC; always render them in Mauritius time so the displayed time
// matches the local clock regardless of the admin's browser/server timezone.
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
  const [dateFilter, setDateFilter] = useState('') // yyyy-mm-dd; empty = whole month
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<AttendeeRow[]>([])
  const [expandLoading, setExpandLoading] = useState(false)
  const [savingMark, setSavingMark] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<{ id: string; full_name: string | null }[]>([])
  const [addSelect, setAddSelect] = useState('')
  const [openClasses, setOpenClasses] = useState<Record<string, boolean>>({})

  const supabase = createClient()

  const yearOptions = [nowD.getFullYear() - 1, nowD.getFullYear(), nowD.getFullYear() + 1]
  if (!yearOptions.includes(year)) yearOptions.push(year)

  const load = useCallback(async (gid: string, m: number, y: number) => {
    setLoading(true)
    // Recurring classes are anchored to whenever they were first scheduled — often a month
    // before the one being viewed — so classes are NOT date-filtered here; occurrences for the
    // selected month are computed client-side (occurrencesInMonth) from each class's own rule.
    let q = (supabase as any)
      .from('live_classes')
      .select('id, title, grade_id, scheduled_at, is_published, attendance_open, is_recurring, recurrence_day_of_week, grade:grades(name, color)')
      .eq('is_published', true)
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

    const ids = cs.map((c) => c.id)
    if (ids.length > 0) {
      const monthStart = new Date(y, m - 1, 1).toISOString().slice(0, 10)
      const monthEnd = new Date(y, m, 1).toISOString().slice(0, 10)
      const { data: marks } = await (supabase as any)
        .from('live_attendance')
        .select('live_class_id, occurrence_date')
        .in('live_class_id', ids)
        .gte('occurrence_date', monthStart)
        .lt('occurrence_date', monthEnd)
        .not('scheduled_end_time', 'is', null)
      const counts: Record<string, number> = {}
      for (const row of (marks ?? []) as any[]) {
        const key = `${row.live_class_id}::${row.occurrence_date}`
        counts[key] = (counts[key] ?? 0) + 1
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

  async function handleExpand(session: Session) {
    const cls = session.cls
    if (expandedId === session.key) { setExpandedId(null); return }
    setExpandedId(session.key)
    setExpandLoading(true)
    setAddSelect('')
    // live_attendance.student_id references auth.users, not profiles, so PostgREST can't embed
    // profiles directly — fetch the rows, then resolve student names in a second query.
    const { data } = await (supabase as any)
      .from('live_attendance')
      .select('id, student_id, entry_time, scheduled_end_time, is_absent')
      .eq('live_class_id', cls.id)
      .eq('occurrence_date', session.occurrenceDate)
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

  const isPresent = (r: AttendeeRow) => !!r.scheduled_end_time && !r.is_absent

  // Correct a student's attendance: mark them present or absent.
  async function setStatus(sessionKey: string, row: AttendeeRow, status: 'present' | 'absent') {
    setSavingMark(row.id)
    const patch = status === 'present'
      ? { scheduled_end_time: new Date().toISOString(), is_absent: false }
      : { scheduled_end_time: null, is_absent: true }
    const { error } = await (supabase as any)
      .from('live_attendance')
      .update(patch)
      .eq('id', row.id)
    if (error) {
      toast.error(error.message)
    } else {
      const wasPresent = isPresent(row)
      const nowPresent = status === 'present'
      setExpandedRows((prev) => prev.map((r) => r.id === row.id ? { ...r, ...patch } : r))
      if (wasPresent !== nowPresent) {
        setMarkCounts((prev) => ({ ...prev, [sessionKey]: Math.max(0, (prev[sessionKey] ?? 0) + (nowPresent ? 1 : -1)) }))
      }
      toast.success(status === 'present' ? 'Marked present' : 'Marked absent')
    }
    setSavingMark(null)
  }

  // Add a student who has no record yet (e.g. attended but couldn't join, or a no-show).
  async function addAttendance(session: Session, studentId: string, status: 'present' | 'absent') {
    const cls = session.cls
    setSavingMark(studentId)
    const nowIso = new Date().toISOString()
    const patch = status === 'present'
      ? { scheduled_end_time: nowIso, is_absent: false }
      : { scheduled_end_time: null, is_absent: true }
    const { data, error } = await (supabase as any)
      .from('live_attendance')
      .insert({ live_class_id: cls.id, student_id: studentId, grade_id: cls.grade_id, entry_time: nowIso, occurrence_date: session.occurrenceDate, ...patch })
      .select('id, student_id, entry_time, scheduled_end_time, is_absent')
      .single()
    if (error || !data) {
      toast.error(error?.message ?? 'Could not add the student.')
    } else {
      const name = candidates.find((c) => c.id === studentId)?.full_name ?? null
      setExpandedRows((prev) => [...prev, { ...data, profile: { full_name: name } } as AttendeeRow])
      setCandidates((prev) => prev.filter((c) => c.id !== studentId))
      if (status === 'present') setMarkCounts((prev) => ({ ...prev, [session.key]: (prev[session.key] ?? 0) + 1 }))
      setAddSelect('')
      toast.success(status === 'present' ? 'Student added as present' : 'Student added as absent')
    }
    setSavingMark(null)
  }

  const openCount = classes.filter((c) => c.attendance_open).length
  const isPastMonth = year < nowD.getFullYear() || (year === nowD.getFullYear() && month < nowD.getMonth() + 1)

  // Expand each class into one Session per real weekly occurrence within the selected month —
  // this is what makes a recurring class show its correct date each week instead of always its
  // original anchor date.
  const allSessions: Session[] = []
  for (const cls of classes) {
    for (const d of occurrencesInMonth(cls.scheduled_at, cls.is_recurring, cls.recurrence_day_of_week, year, month)) {
      allSessions.push({ key: `${cls.id}::${d}`, cls, occurrenceDate: d })
    }
  }
  allSessions.sort((a, b) => a.occurrenceDate.localeCompare(b.occurrenceDate) || a.cls.title.localeCompare(b.cls.title))

  // Optional single-date filter: show only sessions that fall on the chosen date.
  const visibleSessions = dateFilter ? allSessions.filter((s) => s.occurrenceDate === dateFilter) : allSessions

  // Group by grade, then by class — each class folder lists every date attendance was opened
  // for it (most recent first), so an admin sees "G7 September Live Class" once, with every
  // session date underneath it, instead of dates from different classes interleaved.
  const grouped: Array<{ key: string; label: string; classes: Array<{ key: string; cls: LiveClass; sessions: Session[] }> }> = []
  for (const s of visibleSessions) {
    const gid = s.cls.grade_id
    let g = grouped.find((x) => x.key === gid)
    if (!g) { g = { key: gid, label: s.cls.grade?.name ?? 'Unknown Grade', classes: [] }; grouped.push(g) }
    let c = g.classes.find((x) => x.key === s.cls.id)
    if (!c) { c = { key: s.cls.id, cls: s.cls, sessions: [] }; g.classes.push(c) }
    c.sessions.push(s)
  }
  for (const g of grouped) {
    for (const c of g.classes) c.sessions.sort((a, b) => b.occurrenceDate.localeCompare(a.occurrenceDate))
  }

  function toggleClass(key: string) {
    setOpenClasses((prev) => ({ ...prev, [key]: !prev[key] }))
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
        {/* Jump to a specific date — narrows the month's classes to that day. */}
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => {
            const v = e.target.value
            setDateFilter(v)
            if (v) { const d = new Date(`${v}T00:00:00`); setMonth(d.getMonth() + 1); setYear(d.getFullYear()) }
          }}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          aria-label="Filter by date"
        />
        {dateFilter && (
          <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={() => setDateFilter('')}>Clear date</Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : visibleSessions.length === 0 ? (
        <div className="py-20 text-center rounded-xl border border-border/60">
          <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          {dateFilter ? (
            <>
              <p className="text-muted-foreground">No live classes on {new Date(`${dateFilter}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.</p>
              <p className="text-xs text-muted-foreground mt-1">Try another date or clear the date filter to see the whole month.</p>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">No live classes scheduled for {monthLabel}.</p>
              <p className="text-xs text-muted-foreground mt-1">Schedule and publish live classes to manage attendance.</p>
            </>
          )}
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
              <div className="space-y-3">
                {group.classes.map((classGroup) => {
                  const cls = classGroup.cls
                  const grade = cls.grade
                  const classOpen = openClasses[classGroup.key] ?? true
                  const presentTotal = classGroup.sessions.reduce((n, s) => n + (markCounts[s.key] ?? 0), 0)
                  return (
                    <div key={classGroup.key} className="rounded-xl border border-border/60 overflow-hidden">
                      {/* Class folder header — every attendance date for this class lives underneath it */}
                      <button
                        onClick={() => toggleClass(classGroup.key)}
                        className="w-full flex items-center gap-2 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                      >
                        {classOpen
                          ? <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                          : <Folder className="w-4 h-4 text-muted-foreground shrink-0" />
                        }
                        <span className="font-medium">{cls.title}</span>
                        {cls.is_recurring && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">Weekly</Badge>
                        )}
                        {!gradeFilter && grade && (
                          <Badge variant="outline" className="text-[10px]" style={{ borderColor: `${grade.color}40`, color: grade.color, backgroundColor: `${grade.color}10` }}>
                            {grade.name}
                          </Badge>
                        )}
                        <span className="ml-auto text-xs text-muted-foreground flex items-center gap-3 shrink-0">
                          <span>{classGroup.sessions.length} date{classGroup.sessions.length !== 1 ? 's' : ''}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {presentTotal} present total</span>
                          {classOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </span>
                      </button>

                      {classOpen && (
                <div className="overflow-x-auto border-t border-border/60">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead className="bg-muted/10 border-b border-border/60">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Present</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Attendance</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {classGroup.sessions.map((session) => {
                        const count = markCounts[session.key] ?? 0
                        const isExpanded = expandedId === session.key
                        const isToggling = togglingId === cls.id
                        const isCurrentWeek = session.occurrenceDate === currentOccurrenceDate(cls.scheduled_at, cls.is_recurring, cls.recurrence_day_of_week)
                        return (
                          <>
                            <tr
                              key={session.key}
                              className={cls.attendance_open && isCurrentWeek
                                ? 'bg-green-50/50 dark:bg-green-950/10 hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors'
                                : 'hover:bg-muted/20 transition-colors'}
                            >
                              <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {cls.attendance_open && isCurrentWeek && (
                                    <span className="relative flex h-2 w-2 shrink-0">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                                    </span>
                                  )}
                                  {formatOccurrenceDate(session.occurrenceDate)} · {fmtTime(cls.scheduled_at)}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="flex items-center gap-1 font-medium text-sm">
                                  <Users className="w-3.5 h-3.5 text-primary" />
                                  {count}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {isCurrentWeek ? (
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
                                ) : (
                                  <span className="text-xs text-muted-foreground">Past session</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => handleExpand(session)}
                                >
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  {isExpanded ? 'Hide' : 'View / Edit'}
                                </Button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr key={`${session.key}-exp`}>
                                <td colSpan={4} className="px-4 pb-4 pt-2 bg-muted/10">
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
                                                const present = isPresent(row)
                                                const absent = row.is_absent
                                                return (
                                                  <tr key={row.id}>
                                                    <td className="py-1.5 font-medium pr-4">{row.profile?.full_name ?? 'Unknown'}</td>
                                                    <td className="py-1.5 text-muted-foreground pr-4">{fmtTime(row.entry_time)}</td>
                                                    <td className="py-1.5 text-muted-foreground pr-4">{present ? fmtTime(row.scheduled_end_time!) : '—'}</td>
                                                    <td className="py-1.5">
                                                      {present
                                                        ? <span className="text-green-600 dark:text-green-400 font-semibold">Present</span>
                                                        : absent
                                                        ? <span className="text-red-500 font-semibold">Absent</span>
                                                        : <span className="text-orange-500 font-semibold">Joined only</span>}
                                                    </td>
                                                    <td className="py-1.5 text-right">
                                                      <div className="inline-flex items-center gap-1">
                                                        <Button
                                                          variant="ghost" size="sm"
                                                          className={`h-6 text-[11px] gap-1 ${present ? 'text-green-600 bg-green-50 dark:bg-green-950/20' : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20'}`}
                                                          disabled={savingMark === row.id || present}
                                                          onClick={() => setStatus(session.key, row, 'present')}
                                                        >
                                                          <Check className="w-3 h-3" /> Present
                                                        </Button>
                                                        <Button
                                                          variant="ghost" size="sm"
                                                          className={`h-6 text-[11px] gap-1 ${absent ? 'text-red-600 bg-red-50 dark:bg-red-950/20' : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20'}`}
                                                          disabled={savingMark === row.id || absent}
                                                          onClick={() => setStatus(session.key, row, 'absent')}
                                                        >
                                                          {savingMark === row.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />} Absent
                                                        </Button>
                                                      </div>
                                                    </td>
                                                  </tr>
                                                )
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}

                                      {/* Add a student who has no record — present or absent */}
                                      {candidates.length > 0 && (
                                        <div className="mt-3 flex items-center gap-2 flex-wrap border-t border-border/30 pt-3">
                                          <span className="text-[11px] text-muted-foreground">Add a student:</span>
                                          <Select value={addSelect} onValueChange={setAddSelect}>
                                            <SelectTrigger className="w-56 h-7 text-xs"><SelectValue placeholder="Select a student" /></SelectTrigger>
                                            <SelectContent>
                                              {candidates.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name ?? 'Unnamed'}</SelectItem>)}
                                            </SelectContent>
                                          </Select>
                                          <Button
                                            size="sm"
                                            className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                                            disabled={!addSelect || savingMark === addSelect}
                                            onClick={() => addSelect && addAttendance(session, addSelect, 'present')}
                                          >
                                            {savingMark === addSelect ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <UserPlus className="w-3 h-3 mr-1" />}
                                            Present
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
                                            disabled={!addSelect || savingMark === addSelect}
                                            onClick={() => addSelect && addAttendance(session, addSelect, 'absent')}
                                          >
                                            Absent
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
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

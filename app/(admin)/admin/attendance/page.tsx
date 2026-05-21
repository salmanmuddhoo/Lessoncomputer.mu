'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus, ClipboardList, Users, Clock, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface Grade { id: string; name: string; color: string }
interface Session {
  id: string
  grade_id: string
  label: string | null
  opens_at: string
  closes_at: string
  grade: { name: string; color: string } | null
}
interface Mark {
  id: string
  student_id: string
  marked_at: string
  profile: { full_name: string | null } | null
}

function Countdown({ closesAt }: { closesAt: string }) {
  const [secs, setSecs] = useState(() =>
    Math.max(0, Math.floor((new Date(closesAt).getTime() - Date.now()) / 1000))
  )
  useEffect(() => {
    if (secs <= 0) return
    const t = setInterval(() => setSecs((s) => (s <= 1 ? (clearInterval(t), 0) : s - 1)), 1000)
    return () => clearInterval(t)
  }, [])
  const m = Math.floor(secs / 60)
  const s = secs % 60
  if (secs <= 0) return <span className="text-muted-foreground">Closed</span>
  return (
    <span className="font-mono font-bold tabular-nums">
      {m}:{s.toString().padStart(2, '0')}
    </span>
  )
}

export default function AdminAttendancePage() {
  const [grades, setGrades] = useState<Grade[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [markCounts, setMarkCounts] = useState<Record<string, number>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedMarks, setExpandedMarks] = useState<Mark[]>([])
  const [expandLoading, setExpandLoading] = useState(false)
  const [gradeFilter, setGradeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form
  const [formGrade, setFormGrade] = useState('')
  const [formLabel, setFormLabel] = useState('')
  const [formDuration, setFormDuration] = useState('5')

  const supabase = createClient()
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async (gid?: string) => {
    const [{ data: gData }, { data: sData }] = await Promise.all([
      supabase.from('grades').select('id, name, color').eq('is_active', true).order('order_index'),
      gid
        ? (supabase as any)
            .from('attendance_sessions')
            .select('id, grade_id, label, opens_at, closes_at, grade:grades(name, color)')
            .eq('grade_id', gid)
            .order('opens_at', { ascending: false })
            .limit(100)
        : (supabase as any)
            .from('attendance_sessions')
            .select('id, grade_id, label, opens_at, closes_at, grade:grades(name, color)')
            .order('opens_at', { ascending: false })
            .limit(100),
    ])
    const gs = (gData ?? []) as Grade[]
    setGrades(gs)
    if (gs.length > 0 && !formGrade) setFormGrade(gs[0].id)
    const ss = (sData ?? []) as Session[]
    setSessions(ss)

    // Fetch mark counts
    if (ss.length > 0) {
      const ids = ss.map((s) => s.id)
      const { data: mData } = await (supabase as any)
        .from('attendance_marks')
        .select('session_id')
        .in('session_id', ids)
      const counts: Record<string, number> = {}
      for (const row of (mData ?? []) as any[]) {
        counts[row.session_id] = (counts[row.session_id] ?? 0) + 1
      }
      setMarkCounts(counts)
    }
    setLoading(false)
  }, [gradeFilter])

  useEffect(() => {
    load(gradeFilter || undefined)
  }, [gradeFilter])

  // Auto-refresh mark counts every 15s if there's an active session
  useEffect(() => {
    const hasActive = sessions.some((s) => new Date(s.closes_at) > new Date())
    if (!hasActive) {
      if (pollRef.current) clearInterval(pollRef.current)
      return
    }
    pollRef.current = setInterval(async () => {
      const ids = sessions.map((s) => s.id)
      if (!ids.length) return
      const { data: mData } = await (supabase as any)
        .from('attendance_marks')
        .select('session_id')
        .in('session_id', ids)
      const counts: Record<string, number> = {}
      for (const row of (mData ?? []) as any[]) {
        counts[row.session_id] = (counts[row.session_id] ?? 0) + 1
      }
      setMarkCounts(counts)
    }, 15_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [sessions])

  async function handleOpen() {
    if (!formGrade) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const durationMs = Number(formDuration) * 60 * 1000
    const opensAt = new Date()
    const closesAt = new Date(opensAt.getTime() + durationMs)
    const { error } = await (supabase as any)
      .from('attendance_sessions')
      .insert({
        grade_id: formGrade,
        label: formLabel.trim() || null,
        opened_by: user!.id,
        opens_at: opensAt.toISOString(),
        closes_at: closesAt.toISOString(),
      })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`Attendance opened for ${formDuration} minute${Number(formDuration) !== 1 ? 's' : ''}`)
      setDialogOpen(false)
      setFormLabel('')
      load(gradeFilter || undefined)
    }
    setSaving(false)
  }

  async function handleExpand(sessionId: string) {
    if (expandedId === sessionId) { setExpandedId(null); return }
    setExpandedId(sessionId)
    setExpandLoading(true)
    const { data: marksRaw } = await (supabase as any)
      .from('attendance_marks')
      .select('id, student_id, marked_at, profile:profiles(full_name)')
      .eq('session_id', sessionId)
      .order('marked_at', { ascending: true })
    setExpandedMarks((marksRaw ?? []) as Mark[])
    setExpandLoading(false)
  }

  const activeSessions = sessions.filter((s) => new Date(s.closes_at) > new Date())
  const pastSessions = sessions.filter((s) => new Date(s.closes_at) <= new Date())

  function formatWindow(s: Session) {
    const diffMin = Math.round((new Date(s.closes_at).getTime() - new Date(s.opens_at).getTime()) / 60_000)
    return `${diffMin} min`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Open attendance windows and track student presence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => load(gradeFilter || undefined)}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-accent"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" /> Open Attendance
          </Button>
        </div>
      </div>

      {/* Grade filter */}
      <div className="flex items-center gap-3 mb-6">
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
      ) : (
        <div className="space-y-6">
          {/* Active sessions */}
          {activeSessions.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Live Now</h2>
              {activeSessions.map((s) => {
                const grade = s.grade
                const count = markCounts[s.id] ?? 0
                const isExpanded = expandedId === s.id
                return (
                  <div key={s.id} className="rounded-2xl border-2 border-green-500/40 bg-green-50 dark:bg-green-950/20 overflow-hidden">
                    <button
                      onClick={() => handleExpand(s.id)}
                      className="w-full flex items-center gap-4 p-5 text-left"
                    >
                      <span className="relative flex h-3 w-3 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {grade && (
                            <Badge variant="outline" style={{ borderColor: `${grade.color}40`, color: grade.color, backgroundColor: `${grade.color}10` }}>
                              {grade.name}
                            </Badge>
                          )}
                          {s.label && <span className="text-sm font-medium">{s.label}</span>}
                          <span className="text-xs text-muted-foreground">
                            {new Date(s.opens_at).toLocaleTimeString('en-GB', { timeStyle: 'short' })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <div className="flex items-center gap-1.5 text-green-700 dark:text-green-400 font-semibold text-sm">
                            <Users className="w-4 h-4" />
                            {count} present
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Clock className="w-3 h-3" />
                            <Countdown closesAt={s.closes_at} />
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-green-200 dark:border-green-800 px-5 pb-4 pt-3 bg-green-50/50 dark:bg-green-950/10">
                        {expandLoading ? (
                          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                        ) : expandedMarks.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-3">No students have marked present yet.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {expandedMarks.map((m) => (
                              <div key={m.id} className="flex items-center justify-between text-sm">
                                <span className="font-medium">{m.profile?.full_name ?? 'Unknown'}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(m.marked_at).toLocaleTimeString('en-GB', { timeStyle: 'short' })}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Past sessions */}
          {pastSessions.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Past Sessions
              </h2>
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead className="bg-muted/30 border-b border-border/60">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date / Time</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Grade</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Label</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Window</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Present</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {pastSessions.map((s) => {
                        const grade = s.grade
                        const count = markCounts[s.id] ?? 0
                        const isExpanded = expandedId === s.id
                        return (
                          <>
                            <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                                {new Date(s.opens_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                              </td>
                              <td className="px-4 py-3">
                                {grade && (
                                  <Badge variant="outline" style={{ borderColor: `${grade.color}40`, color: grade.color, backgroundColor: `${grade.color}10` }}>
                                    {grade.name}
                                  </Badge>
                                )}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{s.label ?? '—'}</td>
                              <td className="px-4 py-3 text-muted-foreground">{formatWindow(s)}</td>
                              <td className="px-4 py-3">
                                <span className="flex items-center gap-1 font-medium">
                                  <Users className="w-3.5 h-3.5 text-primary" />
                                  {count}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => handleExpand(s.id)}
                                >
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  {isExpanded ? 'Hide' : 'View'}
                                </Button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr key={`${s.id}-expanded`}>
                                <td colSpan={6} className="px-4 pb-4 pt-2 bg-muted/10">
                                  {expandLoading ? (
                                    <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                                  ) : expandedMarks.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-2">No students marked present.</p>
                                  ) : (
                                    <div className="flex flex-wrap gap-3">
                                      {expandedMarks.map((m) => (
                                        <div key={m.id} className="flex items-center gap-2 text-sm bg-background rounded-lg border border-border/60 px-3 py-1.5">
                                          <span className="font-medium">{m.profile?.full_name ?? 'Unknown'}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {new Date(m.marked_at).toLocaleTimeString('en-GB', { timeStyle: 'short' })}
                                          </span>
                                        </div>
                                      ))}
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
          )}

          {activeSessions.length === 0 && pastSessions.length === 0 && (
            <div className="py-20 text-center rounded-xl border border-border/60">
              <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No attendance sessions yet.</p>
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-accent" onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> Open First Session
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Open attendance dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Open Attendance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Grade *</Label>
              <Select value={formGrade} onValueChange={setFormGrade}>
                <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                <SelectContent>
                  {grades.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Duration *</Label>
              <Select value={formDuration} onValueChange={setFormDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 minute</SelectItem>
                  <SelectItem value="2">2 minutes</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Label (optional)</Label>
              <Input
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="e.g. Tuesday Algebra, Chapter 4 class…"
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleOpen}
              disabled={saving || !formGrade}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Open Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

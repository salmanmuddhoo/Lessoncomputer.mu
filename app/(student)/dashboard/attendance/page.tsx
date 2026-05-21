import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { ClipboardList, CheckCircle2, XCircle } from 'lucide-react'
import { AttendanceMarkButton } from '@/components/lc/attendance-mark-button'

export const metadata: Metadata = { title: 'Attendance' }

export default async function StudentAttendancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRaw } = await (supabase as any)
    .from('profiles')
    .select('grade_id')
    .eq('id', user.id)
    .single()
  const gradeId = (profileRaw as any)?.grade_id as string | null

  if (!gradeId) {
    return (
      <div className="py-20 text-center">
        <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground">No grade assigned to your account.</p>
      </div>
    )
  }

  // Require live subscription
  const { data: subs } = await supabase
    .from('student_subscriptions')
    .select('package:subscription_packages(package_type)')
    .eq('student_id', user.id)
    .eq('status', 'active')

  const hasLive = (subs ?? []).some((s: any) => s.package?.package_type === 'live_month')
  if (!hasLive) {
    return (
      <div className="py-20 text-center rounded-xl border border-border/60">
        <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground">Attendance is only available for Live Classes subscribers.</p>
      </div>
    )
  }

  // Fetch all sessions for this grade
  const { data: sessionsRaw } = await (supabase as any)
    .from('attendance_sessions')
    .select('id, label, opens_at, closes_at')
    .eq('grade_id', gradeId)
    .order('opens_at', { ascending: false })
    .limit(200)

  const sessions = (sessionsRaw ?? []) as Array<{
    id: string
    label: string | null
    opens_at: string
    closes_at: string
  }>

  // Fetch student's marks
  const sessionIds = sessions.map((s) => s.id)
  const marksBySession: Record<string, string> = {}
  if (sessionIds.length > 0) {
    const { data: marksRaw } = await (supabase as any)
      .from('attendance_marks')
      .select('session_id, marked_at')
      .eq('student_id', user.id)
      .in('session_id', sessionIds)
    for (const m of (marksRaw ?? []) as any[]) {
      marksBySession[m.session_id] = m.marked_at
    }
  }

  const now = new Date()
  const activeSession = sessions.find(
    (s) => new Date(s.opens_at) <= now && new Date(s.closes_at) > now
  )
  const pastSessions = sessions.filter((s) => new Date(s.closes_at) <= now)

  const presentCount = pastSessions.filter((s) => marksBySession[s.id]).length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Mark your presence during live class sessions
        </p>
      </div>

      {/* Summary */}
      {pastSessions.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border/60 p-4 text-center">
            <p className="text-2xl font-bold">{pastSessions.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Sessions</p>
          </div>
          <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 p-4 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{presentCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Present</p>
          </div>
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{pastSessions.length - presentCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Absent</p>
          </div>
        </div>
      )}

      {/* Active session */}
      {activeSession ? (
        <div className="rounded-2xl border-2 border-green-500/40 bg-green-50 dark:bg-green-950/20 p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
            </span>
            <span className="text-sm font-semibold text-green-700 dark:text-green-400">
              Attendance is open now!
            </span>
          </div>
          {activeSession.label && (
            <p className="text-sm text-muted-foreground mb-4">{activeSession.label}</p>
          )}
          <AttendanceMarkButton
            sessionId={activeSession.id}
            closesAt={activeSession.closes_at}
            alreadyMarked={!!marksBySession[activeSession.id]}
            userId={user.id}
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 p-6 text-center">
          <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No attendance session is currently open.</p>
          <p className="text-xs text-muted-foreground mt-1">Your teacher will open one during class.</p>
        </div>
      )}

      {/* History */}
      {pastSessions.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Attendance History</h2>
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[420px]">
                <thead className="bg-muted/30 border-b border-border/60">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Session</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Marked at</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {pastSessions.map((s) => {
                    const present = !!marksBySession[s.id]
                    const markedAt = marksBySession[s.id]
                    return (
                      <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {new Date(s.opens_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-sm">
                          {s.label || new Date(s.opens_at).toLocaleTimeString('en-GB', { timeStyle: 'short' })}
                        </td>
                        <td className="px-4 py-3">
                          {present ? (
                            <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium text-sm">
                              <CheckCircle2 className="w-4 h-4" /> Present
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-red-500 font-medium text-sm">
                              <XCircle className="w-4 h-4" /> Absent
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {markedAt
                            ? new Date(markedAt).toLocaleTimeString('en-GB', { timeStyle: 'short' })
                            : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

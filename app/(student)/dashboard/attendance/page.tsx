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

  // Fetch all published live classes for this grade (most recent first)
  const { data: classesRaw } = await (supabase as any)
    .from('live_classes')
    .select('id, title, scheduled_at, attendance_open')
    .eq('grade_id', gradeId)
    .eq('is_published', true)
    .order('scheduled_at', { ascending: false })
    .limit(200)

  const classes = (classesRaw ?? []) as Array<{
    id: string
    title: string
    scheduled_at: string
    attendance_open: boolean
  }>

  // Fetch student's attendance records
  const classIds = classes.map((c) => c.id)
  const attendanceByClass: Record<string, { entry_time: string; scheduled_end_time: string | null }> = {}
  if (classIds.length > 0) {
    const { data: records } = await (supabase as any)
      .from('live_attendance')
      .select('live_class_id, entry_time, scheduled_end_time')
      .eq('student_id', user.id)
      .in('live_class_id', classIds)
    for (const r of (records ?? []) as any[]) {
      attendanceByClass[r.live_class_id] = {
        entry_time: r.entry_time,
        scheduled_end_time: r.scheduled_end_time,
      }
    }
  }

  // Active session = a class with attendance_open = true
  const activeClass = classes.find((c) => c.attendance_open)
  const activeRecord = activeClass ? attendanceByClass[activeClass.id] : null

  // History = past classes (scheduled_at in the past)
  const now = new Date()
  const pastClasses = classes.filter((c) => new Date(c.scheduled_at) < now && !c.attendance_open)

  const presentCount = pastClasses.filter((c) => !!attendanceByClass[c.id]?.scheduled_end_time).length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Mark your presence during live class sessions
        </p>
      </div>

      {/* Summary stats */}
      {pastClasses.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border/60 p-4 text-center">
            <p className="text-2xl font-bold">{pastClasses.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Classes</p>
          </div>
          <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 p-4 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{presentCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Present</p>
          </div>
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{pastClasses.length - presentCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Absent</p>
          </div>
        </div>
      )}

      {/* Active attendance session */}
      {activeClass ? (
        <div className="rounded-2xl border-2 border-green-500/40 bg-green-50 dark:bg-green-950/20 p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
            </span>
            <span className="text-sm font-semibold text-green-700 dark:text-green-400">
              Attendance is open!
            </span>
          </div>
          <p className="text-sm font-medium mb-4">{activeClass.title}</p>
          {activeRecord?.entry_time && (
            <p className="text-xs text-muted-foreground mb-3">
              You joined at {new Date(activeRecord.entry_time).toLocaleTimeString('en-GB', { timeStyle: 'short' })}
            </p>
          )}
          <AttendanceMarkButton
            liveClassId={activeClass.id}
            gradeId={gradeId}
            alreadyMarked={!!activeRecord?.scheduled_end_time}
            userId={user.id}
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 p-6 text-center">
          <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No attendance session is currently open.</p>
          <p className="text-xs text-muted-foreground mt-1">Your teacher will open it during class.</p>
        </div>
      )}

      {/* History */}
      {pastClasses.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Attendance History</h2>
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[440px]">
                <thead className="bg-muted/30 border-b border-border/60">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Class</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Marked at</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {pastClasses.map((cls) => {
                    const record = attendanceByClass[cls.id]
                    const present = !!record?.scheduled_end_time
                    return (
                      <tr key={cls.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-sm max-w-[180px] truncate">{cls.title}</td>
                        <td className="px-4 py-3 text-muted-foreground text-sm whitespace-nowrap">
                          {new Date(cls.scheduled_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
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
                          {record?.scheduled_end_time
                            ? new Date(record.scheduled_end_time).toLocaleTimeString('en-GB', { timeStyle: 'short' })
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

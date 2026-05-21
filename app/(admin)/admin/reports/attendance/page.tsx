import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import { ClipboardList, Clock, Users } from 'lucide-react'
import { AttendanceReportFilters } from '@/components/lc/attendance-report-filters'

export const metadata: Metadata = { title: 'Attendance Report | Admin' }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

interface PageProps {
  searchParams: Promise<{ grade_id?: string; month?: string; year?: string }>
}

function formatDuration(entryIso: string, endIso: string | null): string {
  if (!endIso) return '—'
  const diffMs = new Date(endIso).getTime() - new Date(entryIso).getTime()
  if (diffMs <= 0) return '—'
  const totalMin = Math.round(diffMs / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

export default async function AttendanceReportPage({ searchParams }: PageProps) {
  const { grade_id, month, year } = await searchParams
  const supabase = await createClient()

  const now = new Date()
  const selectedMonth = month ? Number(month) : now.getMonth() + 1
  const selectedYear = year ? Number(year) : now.getFullYear()

  const [{ data: gradesRaw }, { data: rawAttendance }] = await Promise.all([
    (supabase as any).from('grades').select('id, name, color').eq('is_active', true).order('order_index'),
    grade_id
      ? (supabase as any)
          .from('live_attendance')
          .select('id, entry_time, scheduled_end_time, student_id, live_class_id, live_class:live_classes(title, scheduled_at)')
          .eq('grade_id', grade_id)
          .gte('entry_time', new Date(selectedYear, selectedMonth - 1, 1).toISOString())
          .lt('entry_time', new Date(selectedYear, selectedMonth, 1).toISOString())
          .order('entry_time', { ascending: false })
          .limit(500)
      : Promise.resolve({ data: [] }),
  ])

  const attendance = (rawAttendance ?? []) as Array<{
    id: string
    entry_time: string
    scheduled_end_time: string | null
    student_id: string
    live_class_id: string
    live_class: { title: string; scheduled_at: string } | null
  }>

  const grades = (gradesRaw ?? []) as Array<{ id: string; name: string; color: string }>

  const studentIds = [...new Set(attendance.map((a) => a.student_id))]
  const profileMap: Record<string, { full_name: string | null }> = {}
  if (studentIds.length > 0) {
    const { data: profiles } = await (supabase as any)
      .from('profiles')
      .select('id, full_name')
      .in('id', studentIds)
    for (const p of (profiles ?? []) as Array<{ id: string; full_name: string | null }>) {
      profileMap[p.id] = { full_name: p.full_name }
    }
  }

  const selectedGrade = grades.find((g) => g.id === grade_id)
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]
  const uniqueStudents = new Set(attendance.map((a) => a.student_id)).size
  const uniqueClasses = new Set(attendance.map((a) => a.live_class_id)).size

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Attendance Report</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Live class attendance per student</p>
      </div>

      <AttendanceReportFilters
        grades={grades}
        selectedGradeId={grade_id ?? ''}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        years={years}
      />

      {!grade_id ? (
        <div className="py-20 text-center rounded-xl border border-border/60">
          <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">Select a grade to view attendance records.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl border border-border/60 p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Records</p>
              <p className="text-2xl font-bold">{attendance.length}</p>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Unique Students</p>
              <p className="text-2xl font-bold">{uniqueStudents}</p>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Classes</p>
              <p className="text-2xl font-bold">{uniqueClasses}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            {selectedGrade && (
              <Badge
                variant="outline"
                style={{ borderColor: `${selectedGrade.color}40`, color: selectedGrade.color, backgroundColor: `${selectedGrade.color}10` }}
              >
                {selectedGrade.name}
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {MONTHS[selectedMonth - 1]} {selectedYear}
            </span>
          </div>

          <div className="rounded-xl border border-border/60 overflow-hidden">
            {attendance.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-muted-foreground">No attendance records for this period.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead className="bg-muted/30 border-b border-border/60">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Live Class</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Entry Time</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mark Present Time</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {attendance.map((row) => {
                      const profile = profileMap[row.student_id]
                      return (
                        <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-medium">{profile?.full_name ?? 'Unknown'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{row.live_class?.title ?? '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatTime(row.entry_time)}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {row.scheduled_end_time ? formatTime(row.scheduled_end_time) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                              {formatDuration(row.entry_time, row.scheduled_end_time)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

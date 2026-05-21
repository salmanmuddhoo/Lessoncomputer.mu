'use client'

import { useRouter } from 'next/navigation'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

interface Grade { id: string; name: string }

interface Props {
  grades: Grade[]
  selectedGradeId: string
  selectedMonth: number
  selectedYear: number
  years: number[]
}

export function AttendanceReportFilters({ grades, selectedGradeId, selectedMonth, selectedYear, years }: Props) {
  const router = useRouter()

  function navigate(overrides: Record<string, string>) {
    const params = new URLSearchParams()
    const gradeId = overrides.grade_id ?? selectedGradeId
    if (gradeId) params.set('grade_id', gradeId)
    params.set('month', overrides.month ?? String(selectedMonth))
    params.set('year', overrides.year ?? String(selectedYear))
    router.push(`/admin/reports/attendance?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <select
        value={selectedGradeId}
        onChange={(e) => navigate({ grade_id: e.target.value })}
        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">Select grade…</option>
        {grades.map((g) => (
          <option key={g.id} value={g.id}>{g.name}</option>
        ))}
      </select>

      <select
        value={selectedMonth}
        onChange={(e) => navigate({ month: e.target.value })}
        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {MONTHS.map((m, i) => (
          <option key={i + 1} value={i + 1}>{m}</option>
        ))}
      </select>

      <select
        value={selectedYear}
        onChange={(e) => navigate({ year: e.target.value })}
        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  )
}

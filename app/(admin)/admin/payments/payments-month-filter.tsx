'use client'

import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Month/year selector for the payments monthly summary. Navigates with ?month=&year=.
export function PaymentsMonthFilter({ month, year, years }: { month: number; year: number; years: number[] }) {
  const router = useRouter()
  const go = (m: number, y: number) => router.push(`/admin/payments?month=${m}&year=${y}`)
  return (
    <div className="flex items-center gap-2">
      <Select value={String(month)} onValueChange={(v) => go(Number(v), year)}>
        <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          {MONTHS.map((label, i) => <SelectItem key={i} value={String(i + 1)}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={String(year)} onValueChange={(v) => go(month, Number(v))}>
        <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { GraduationCap } from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// Shown only when a student is enrolled in more than one grade — lets them switch which
// grade's content the dashboard shows, without changing the grade on their profile.
export function DashboardGradeFilter({
  grades, selectedId, basePath = '/dashboard',
}: {
  grades: { id: string; name: string }[]
  selectedId: string
  basePath?: string
}) {
  const router = useRouter()
  return (
    <div className="flex items-center gap-2">
      <GraduationCap className="w-4 h-4 text-muted-foreground shrink-0" />
      <Select value={selectedId} onValueChange={(v) => router.push(`${basePath}?grade=${v}`)}>
        <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          {grades.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

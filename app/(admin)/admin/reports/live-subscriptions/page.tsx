import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { RefreshCw, XCircle, Radio } from 'lucide-react'

export const metadata: Metadata = { title: 'Live Subscriptions Report' }

export default async function LiveSubscriptionsReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((me as any)?.role !== 'admin') redirect('/dashboard')

  const today = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().split('T')[0] // Mauritius (UTC+4)

  // Active live subscriptions covering the current month (valid_from..valid_until).
  const { data: subsRaw } = await (supabase as any)
    .from('student_subscriptions')
    .select('student_id, is_recurring, valid_from, valid_until, subscription_type, package:subscription_packages(package_type)')
    .eq('status', 'active')

  const liveSubs = ((subsRaw ?? []) as any[]).filter((s) => {
    const isLive = s.subscription_type === 'live' || s.package?.package_type === 'live_month'
    const current = (!s.valid_until || s.valid_until >= today) && (!s.valid_from || s.valid_from <= today)
    return isLive && current
  })

  // One row per student — prefer a recurring (active) sub if they have several.
  const byStudent = new Map<string, any>()
  for (const s of liveSubs) {
    const existing = byStudent.get(s.student_id)
    if (!existing || (s.is_recurring && !existing.is_recurring)) byStudent.set(s.student_id, s)
  }

  const studentIds = [...byStudent.keys()]
  const profileMap: Record<string, { name: string | null; gradeId: string | null; gradeName: string | null }> = {}
  if (studentIds.length) {
    const { data: profs } = await (supabase as any)
      .from('profiles')
      .select('id, full_name, grade_id, grade:grades(id, name)')
      .in('id', studentIds)
    for (const p of (profs ?? []) as any[]) {
      profileMap[p.id] = { name: p.full_name ?? null, gradeId: p.grade?.id ?? p.grade_id ?? null, gradeName: p.grade?.name ?? null }
    }
  }

  // Group by grade → active (recurring) vs cancelled (recurring turned off, still in paid month).
  type Row = { name: string | null; recurring: boolean }
  const grades = new Map<string, { name: string; active: Row[]; cancelled: Row[] }>()
  for (const [studentId, sub] of byStudent) {
    const prof = profileMap[studentId]
    const gradeId = prof?.gradeId ?? 'unknown'
    const gradeName = prof?.gradeName ?? 'Unknown grade'
    if (!grades.has(gradeId)) grades.set(gradeId, { name: gradeName, active: [], cancelled: [] })
    const bucket = grades.get(gradeId)!
    const row: Row = { name: prof?.name ?? null, recurring: !!sub.is_recurring }
    if (sub.is_recurring) bucket.active.push(row)
    else bucket.cancelled.push(row)
  }

  const gradeList = [...grades.values()].sort((a, b) => a.name.localeCompare(b.name))
  const totalActive = gradeList.reduce((n, g) => n + g.active.length, 0)
  const totalCancelled = gradeList.reduce((n, g) => n + g.cancelled.length, 0)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Live Subscriptions</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Students with a live subscription for the current month, by grade — active (auto-renewing) vs cancelled.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8 max-w-md">
        <div className="rounded-xl border border-border/60 p-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><RefreshCw className="w-3.5 h-3.5 text-green-600" /> Active</div>
          <p className="text-2xl font-bold mt-1">{totalActive}</p>
        </div>
        <div className="rounded-xl border border-border/60 p-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><XCircle className="w-3.5 h-3.5 text-red-500" /> Cancelled</div>
          <p className="text-2xl font-bold mt-1">{totalCancelled}</p>
        </div>
      </div>

      {gradeList.length === 0 ? (
        <div className="py-16 text-center rounded-xl border border-border/60">
          <Radio className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No live subscriptions for the current month.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {gradeList.map((g) => (
            <div key={g.name} className="rounded-xl border border-border/60 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/60">
                <h2 className="font-semibold text-sm">{g.name}</h2>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-green-600 dark:text-green-400 font-medium">{g.active.length} active</span>
                  <span className="text-red-500 font-medium">{g.cancelled.length} cancelled</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/40">
                <div className="p-4">
                  <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-2 flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Active (auto-renewing)</p>
                  {g.active.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">None</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {g.active.map((r, i) => <li key={i}>{r.name ?? <span className="text-muted-foreground italic">Unnamed</span>}</li>)}
                    </ul>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs font-medium text-red-500 mb-2 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Cancelled recurring</p>
                  {g.cancelled.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">None</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {g.cancelled.map((r, i) => <li key={i}>{r.name ?? <span className="text-muted-foreground italic">Unnamed</span>}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

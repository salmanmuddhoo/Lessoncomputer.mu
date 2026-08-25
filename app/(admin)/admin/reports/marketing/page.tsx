import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Megaphone, Users, Globe } from 'lucide-react'
import { referralLabel } from '@/lib/referral-sources'

export const metadata: Metadata = { title: 'Marketing Report' }

// Turn an ISO country code (e.g. "MU") into a readable name ("Mauritius").
function countryName(code: string | null): string {
  if (!code) return 'Unknown'
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

interface Row { key: string; label: string; count: number }

function tally(values: (string | null)[], labeller: (v: string) => string, unknownLabel: string): Row[] {
  const map = new Map<string, number>()
  for (const v of values) {
    const key = v ?? '__unknown__'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, label: key === '__unknown__' ? unknownLabel : labeller(key), count }))
    .sort((a, b) => b.count - a.count)
}

export default async function MarketingReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((me as any)?.role !== 'admin') redirect('/dashboard')

  const { data: studentsRaw } = await (supabase as any)
    .from('profiles')
    .select('referral_source, referral_other, signup_country')
    .eq('role', 'student')

  const students = (studentsRaw ?? []) as Array<{ referral_source: string | null; referral_other: string | null; signup_country: string | null }>
  const total = students.length

  const sourceRows = tally(students.map((s) => s.referral_source), (v) => referralLabel(v), 'Not specified')
  const countryRows = tally(students.map((s) => s.signup_country), (v) => countryName(v), 'Unknown')

  // Free-text answers from students who picked "Other".
  const otherRows = tally(
    students.filter((s) => s.referral_source === 'other').map((s) => s.referral_other),
    (v) => v,
    'Unspecified',
  )

  const knownSource = students.filter((s) => s.referral_source).length
  const knownCountry = students.filter((s) => s.signup_country).length
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0)

  const Breakdown = ({ rows }: { rows: Row[] }) => {
    const max = Math.max(1, ...rows.map((r) => r.count))
    return (
      <div className="divide-y divide-border/40">
        {rows.map((r) => (
          <div key={r.key} className="px-4 py-2.5">
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <span className="text-sm font-medium truncate">{r.label}</span>
              <span className="text-xs text-muted-foreground shrink-0">{r.count} · {pct(r.count)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((r.count / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          Marketing
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">How students found us, and where they&apos;re from</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border/60 p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Students</p>
          <p className="text-2xl font-bold">{total}</p>
        </div>
        <div className="rounded-xl border border-border/60 p-4">
          <p className="text-xs text-muted-foreground">Source known</p>
          <p className="text-2xl font-bold">{knownSource}<span className="text-sm text-muted-foreground font-normal"> / {total}</span></p>
        </div>
        <div className="rounded-xl border border-border/60 p-4">
          <p className="text-xs text-muted-foreground">Country known</p>
          <p className="text-2xl font-bold">{knownCountry}<span className="text-sm text-muted-foreground font-normal"> / {total}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 bg-muted/20 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">How they heard about us</h2>
          </div>
          {total === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No students yet.</p>
          ) : <Breakdown rows={sourceRows} />}
          {otherRows.length > 0 && (
            <div className="border-t border-border/40">
              <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">&ldquo;Other&rdquo; answers</p>
              <div className="divide-y divide-border/40">
                {otherRows.map((r) => (
                  <div key={r.key} className="px-4 py-2 flex items-center justify-between gap-3">
                    <span className="text-sm truncate">{r.label}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border/60 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 bg-muted/20 flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Where they&apos;re from</h2>
          </div>
          {total === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No students yet.</p>
          ) : <Breakdown rows={countryRows} />}
          <p className="px-4 py-2 text-[11px] text-muted-foreground border-t border-border/40">
            Based on the country detected from each student&apos;s IP at signup.
          </p>
        </div>
      </div>
    </div>
  )
}

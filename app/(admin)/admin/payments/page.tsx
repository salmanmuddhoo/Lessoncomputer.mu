import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreditCard, CheckCircle2, XCircle, Clock, CalendarClock, BarChart3, PlayCircle, Radio, Users } from 'lucide-react'
import type { Metadata } from 'next'
import { PaymentsTable } from './payments-table'
import { PaymentsMonthFilter } from './payments-month-filter'
import { formatMoney } from '@/lib/currency-format'

export const metadata: Metadata = { title: 'Payments' }

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface MipsOrder {
  id: string
  student_id: string
  order_type: string
  amount: number
  currency: string
  description: string | null
  status: string
  mips_transaction_id: string | null
  is_recurring: boolean
  created_at: string
  metadata?: { failureReason?: string; transaction_id?: string } | null
  studentName?: string | null
  gradeId?: string | null
  gradeName?: string | null
}

const STATUS_CONFIG = {
  paid:    { label: 'Paid',    icon: CheckCircle2, className: 'text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400' },
  pending: { label: 'Pending', icon: Clock,        className: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 dark:text-yellow-400' },
  failed:  { label: 'Failed',  icon: XCircle,      className: 'text-red-500 bg-red-50 dark:bg-red-950/30' },
}

// Next occurrence of the configured billing day (clamped to month length).
function nextBillingDate(billingDay: number): Date {
  const now = new Date()
  const daysThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const effThis = Math.min(billingDay, daysThisMonth)
  if (now.getDate() <= effThis) return new Date(now.getFullYear(), now.getMonth(), effThis)
  const daysNext = new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate()
  return new Date(now.getFullYear(), now.getMonth() + 1, Math.min(billingDay, daysNext))
}

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ month?: string; year?: string }> }) {
  const { month: mParam, year: yParam } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Payments is finance-restricted — only admins granted finance access may view it.
  const { data: me } = await supabase.from('profiles').select('role, can_access_finance').eq('id', user.id).single()
  if ((me as any)?.role !== 'admin') redirect('/dashboard')
  if ((me as any)?.can_access_finance !== true) redirect('/admin')

  // Selected reporting month (defaults to the current Mauritius month).
  const muNow = new Date(Date.now() + 4 * 60 * 60 * 1000)
  const selYear = Number(yParam) || muNow.getUTCFullYear()
  const selMonth = Number(mParam) || (muNow.getUTCMonth() + 1) // 1–12
  // Month boundaries in Mauritius time (UTC+4), expressed as UTC instants for the query.
  const monthStart = new Date(Date.UTC(selYear, selMonth - 1, 1, -4)).toISOString()
  const monthEnd = new Date(Date.UTC(selYear, selMonth, 1, -4)).toISOString()
  const yearOptions = [muNow.getUTCFullYear() - 2, muNow.getUTCFullYear() - 1, muNow.getUTCFullYear()]
  if (!yearOptions.includes(selYear)) yearOptions.push(selYear)

  const [{ data: ordersRaw, error: ordersError }, { data: recurringSubs }, { data: tokens }, { data: settings }, { data: monthOrdersRaw }] = await Promise.all([
    (supabase as any)
      .from('mips_orders')
      .select('id, student_id, order_type, amount, currency, description, status, mips_transaction_id, is_recurring, created_at, metadata')
      .order('created_at', { ascending: false })
      .limit(200),
    (supabase as any)
      .from('student_subscriptions')
      .select('student_id')
      .eq('subscription_type', 'live')
      .eq('is_recurring', true)
      .eq('status', 'active'),
    (supabase as any)
      .from('student_payment_tokens')
      .select('student_id, max_amount, currency')
      .eq('is_active', true),
    (supabase as any).from('site_settings').select('billing_day').eq('id', 1).single(),
    (supabase as any)
      .from('mips_orders')
      .select('id, student_id, order_type, amount, package_ids, created_at')
      .eq('status', 'paid')
      .gte('created_at', monthStart)
      .lt('created_at', monthEnd),
  ])

  const monthOrders = (monthOrdersRaw ?? []) as Array<{ id: string; student_id: string; order_type: string; amount: number; package_ids: string[] | null; created_at: string }>

  if (ordersError) console.error('[admin/payments] orders fetch error:', ordersError)

  const rawOrders = (ordersRaw ?? []) as MipsOrder[]
  const recurringStudentIds = new Set(((recurringSubs ?? []) as any[]).map((s) => s.student_id))
  const billingDay = Number((settings as any)?.billing_day ?? 28)
  const nextDate = nextBillingDate(billingDay)

  // Profiles (name + grade) for everyone referenced by an order or an active token
  const allStudentIds = [...new Set([
    ...rawOrders.map((o) => o.student_id),
    ...((tokens ?? []) as any[]).map((t) => t.student_id),
    ...monthOrders.map((o) => o.student_id),
  ])]
  const profileMap: Record<string, { name: string | null; gradeId: string | null; gradeName: string | null }> = {}
  if (allStudentIds.length > 0) {
    const { data: profilesData } = await (supabase as any)
      .from('profiles')
      .select('id, full_name, grade_id, grade:grades(id, name)')
      .in('id', allStudentIds)
    for (const p of (profilesData ?? []) as any[]) {
      profileMap[p.id] = { name: p.full_name ?? null, gradeId: p.grade?.id ?? p.grade_id ?? null, gradeName: p.grade?.name ?? null }
    }
  }

  const orders: MipsOrder[] = rawOrders.map((o) => ({
    ...o,
    studentName: profileMap[o.student_id]?.name ?? null,
    gradeId: profileMap[o.student_id]?.gradeId ?? null,
    gradeName: profileMap[o.student_id]?.gradeName ?? null,
  }))

  // ── Monthly sales summary (selected month) ──
  // Attribute each paid order's packages to a grade + type (video vs live). Video packages
  // carry a real price; a live_month package's price is 0 (the charge is on the order), so
  // live revenue = order amount minus the video packages' prices.
  const monthPkgIds = [...new Set(monthOrders.flatMap((o) => o.package_ids ?? []))]
  const pkgMap: Record<string, { price: number; type: string; gradeId: string | null; gradeName: string | null }> = {}
  if (monthPkgIds.length > 0) {
    const { data: pkgData } = await (supabase as any)
      .from('subscription_packages')
      .select('id, price, package_type, grade_id, grade:grades(id, name)')
      .in('id', monthPkgIds)
    for (const p of (pkgData ?? []) as any[]) {
      pkgMap[p.id] = {
        price: Number(p.price ?? 0),
        type: p.package_type ?? 'video',
        gradeId: p.grade?.id ?? p.grade_id ?? null,
        gradeName: p.grade?.name ?? null,
      }
    }
  }

  type GradeBucket = { gradeId: string; gradeName: string; videoSales: number; videoRevenue: number; liveSales: number; liveRevenue: number }
  const buckets = new Map<string, GradeBucket>()
  const bucketFor = (gradeId: string | null, gradeName: string | null): GradeBucket => {
    const key = gradeId ?? '__unknown__'
    let b = buckets.get(key)
    if (!b) { b = { gradeId: key, gradeName: gradeName ?? 'Unknown grade', videoSales: 0, videoRevenue: 0, liveSales: 0, liveRevenue: 0 }; buckets.set(key, b) }
    return b
  }
  const studentsVideo = new Set<string>()
  const studentsLive = new Set<string>()
  let monthRevenue = 0

  for (const o of monthOrders) {
    const amount = Number(o.amount) || 0
    monthRevenue += amount
    const pkgs = (o.package_ids ?? []).map((id) => pkgMap[id]).filter(Boolean)
    if (pkgs.length === 0) {
      // Package rows unavailable (e.g. deleted) — fall back to order_type + student grade.
      const g = profileMap[o.student_id]
      const b = bucketFor(g?.gradeId ?? null, g?.gradeName ?? null)
      if (o.order_type === 'video') { b.videoSales++; b.videoRevenue += amount; studentsVideo.add(o.student_id) }
      else { b.liveSales++; b.liveRevenue += amount; studentsLive.add(o.student_id) }
      continue
    }
    const videoPkgs = pkgs.filter((p) => p.type !== 'live_month')
    const livePkgs = pkgs.filter((p) => p.type === 'live_month')
    for (const vp of videoPkgs) {
      const b = bucketFor(vp.gradeId, vp.gradeName)
      b.videoSales++; b.videoRevenue += vp.price; studentsVideo.add(o.student_id)
    }
    if (livePkgs.length > 0) {
      const videoSum = videoPkgs.reduce((s, p) => s + p.price, 0)
      const liveRevenue = Math.max(0, amount - videoSum)
      const per = liveRevenue / livePkgs.length
      for (const lp of livePkgs) {
        const b = bucketFor(lp.gradeId, lp.gradeName)
        b.liveSales++; b.liveRevenue += per; studentsLive.add(o.student_id)
      }
    }
  }

  const gradeBreakdown = [...buckets.values()].sort((a, b) => a.gradeName.localeCompare(b.gradeName))
  const monthVideoSales = gradeBreakdown.reduce((s, b) => s + b.videoSales, 0)
  const monthLiveSales = gradeBreakdown.reduce((s, b) => s + b.liveSales, 0)

  // Distinct grades present, for the filter dropdown
  const gradeMap = new Map<string, string>()
  for (const o of orders) if (o.gradeId && o.gradeName) gradeMap.set(o.gradeId, o.gradeName)
  const grades = [...gradeMap.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))

  // Upcoming recurring payments: students with an active token AND an active recurring live sub
  const upcoming = ((tokens ?? []) as any[])
    .filter((t) => recurringStudentIds.has(t.student_id))
    .map((t) => ({
      studentId: t.student_id,
      name: profileMap[t.student_id]?.name ?? 'Unknown',
      gradeName: profileMap[t.student_id]?.gradeName ?? null,
      amount: Number(t.max_amount),
      currency: t.currency ?? 'MUR',
    }))
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))

  // Global upcoming recurring payments across all students (next billing cycle).
  const upcomingTotal = upcoming.reduce((sum, u) => sum + (Number.isFinite(u.amount) ? u.amount : 0), 0)
  const upcomingCount = upcoming.length

  const totals = orders.reduce((acc, o) => {
    if (o.status === 'paid') acc.revenue += o.amount
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, { revenue: 0 } as Record<string, number>)

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          Payments
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">All MIPS payment transactions</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="rounded-xl border border-border/60 p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Total Revenue</p>
          <p className="text-2xl font-bold text-primary">Rs {totals.revenue.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-border/60 p-4 space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><CalendarClock className="w-3 h-3" /> Upcoming recurring</p>
          <p className="text-2xl font-bold">Rs {upcomingTotal.toFixed(2)}</p>
          <p className="text-[11px] text-muted-foreground">{upcomingCount} student{upcomingCount !== 1 ? 's' : ''} · next {nextDate.toLocaleDateString('en-MU', { dateStyle: 'medium' })}</p>
        </div>
        {(['paid', 'pending', 'failed'] as const).map((s) => {
          const cfg = STATUS_CONFIG[s]
          return (
            <div key={s} className="rounded-xl border border-border/60 p-4 space-y-1">
              <p className="text-xs text-muted-foreground capitalize">{cfg.label}</p>
              <p className="text-2xl font-bold">{totals[s] ?? 0}</p>
            </div>
          )
        })}
      </div>

      {/* Upcoming recurring payments */}
      <div className="rounded-xl border border-border/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60 bg-muted/20 flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Upcoming recurring payments</h2>
          <span className="ml-auto text-xs text-muted-foreground">Next charge on {nextDate.toLocaleDateString('en-MU', { dateStyle: 'medium' })}</span>
        </div>
        {upcoming.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No students on recurring billing.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/10">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Student</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Grade</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Next payment</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {upcoming.map((u) => (
                  <tr key={u.studentId} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{u.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{u.gradeName ?? '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{nextDate.toLocaleDateString('en-MU', { dateStyle: 'medium' })}</td>
                    <td className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">{formatMoney(u.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Monthly sales summary ── */}
      <div className="rounded-xl border border-border/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60 bg-muted/20 flex items-center gap-2 flex-wrap">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Monthly sales — {MONTHS[selMonth - 1]} {selYear}</h2>
          <div className="ml-auto">
            <PaymentsMonthFilter month={selMonth} year={selYear} years={yearOptions} />
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-xl font-bold text-primary">Rs {monthRevenue.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Bought videos</p>
              <p className="text-xl font-bold">{studentsVideo.size}</p>
              <p className="text-[11px] text-muted-foreground">student{studentsVideo.size !== 1 ? 's' : ''}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Subscribed live</p>
              <p className="text-xl font-bold">{studentsLive.size}</p>
              <p className="text-[11px] text-muted-foreground">student{studentsLive.size !== 1 ? 's' : ''}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><PlayCircle className="w-3 h-3" /> Video sales</p>
              <p className="text-xl font-bold">{monthVideoSales}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Radio className="w-3 h-3" /> Live sales</p>
              <p className="text-xl font-bold">{monthLiveSales}</p>
            </div>
          </div>

          {/* Per-grade breakdown */}
          {gradeBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No paid sales in {MONTHS[selMonth - 1]} {selYear}.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-sm min-w-[560px]">
                <thead className="bg-muted/20">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Grade</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Video sales</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Video revenue</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Live sales</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Live revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {gradeBreakdown.map((b) => (
                    <tr key={b.gradeId} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 font-medium">{b.gradeName}</td>
                      <td className="px-4 py-2.5 text-right">{b.videoSales}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">Rs {b.videoRevenue.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right">{b.liveSales}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">Rs {b.liveRevenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-border/60 bg-muted/10 font-semibold">
                  <tr>
                    <td className="px-4 py-2.5">Total</td>
                    <td className="px-4 py-2.5 text-right">{monthVideoSales}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">Rs {gradeBreakdown.reduce((s, b) => s + b.videoRevenue, 0).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right">{monthLiveSales}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">Rs {gradeBreakdown.reduce((s, b) => s + b.liveRevenue, 0).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      <PaymentsTable initialOrders={orders} grades={grades} />
    </div>
  )
}

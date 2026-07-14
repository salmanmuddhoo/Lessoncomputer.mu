import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreditCard, CheckCircle2, XCircle, Clock, CalendarClock } from 'lucide-react'
import type { Metadata } from 'next'
import { PaymentsTable } from './payments-table'

export const metadata: Metadata = { title: 'Payments' }

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
  metadata?: { failureReason?: string } | null
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

export default async function AdminPaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: ordersRaw, error: ordersError }, { data: recurringSubs }, { data: tokens }, { data: settings }] = await Promise.all([
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
  ])

  if (ordersError) console.error('[admin/payments] orders fetch error:', ordersError)

  const rawOrders = (ordersRaw ?? []) as MipsOrder[]
  const recurringStudentIds = new Set(((recurringSubs ?? []) as any[]).map((s) => s.student_id))
  const billingDay = Number((settings as any)?.billing_day ?? 28)
  const nextDate = nextBillingDate(billingDay)

  // Profiles (name + grade) for everyone referenced by an order or an active token
  const allStudentIds = [...new Set([
    ...rawOrders.map((o) => o.student_id),
    ...((tokens ?? []) as any[]).map((t) => t.student_id),
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border/60 p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Total Revenue</p>
          <p className="text-2xl font-bold text-primary">Rs {totals.revenue.toFixed(2)}</p>
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
                    <td className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">{u.currency} {u.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PaymentsTable initialOrders={orders} grades={grades} />
    </div>
  )
}

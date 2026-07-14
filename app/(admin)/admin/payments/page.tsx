import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreditCard, CheckCircle2, XCircle, Clock } from 'lucide-react'
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
}

const STATUS_CONFIG = {
  paid:    { label: 'Paid',    icon: CheckCircle2, className: 'text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400' },
  pending: { label: 'Pending', icon: Clock,        className: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 dark:text-yellow-400' },
  failed:  { label: 'Failed',  icon: XCircle,      className: 'text-red-500 bg-red-50 dark:bg-red-950/30' },
}

export default async function AdminPaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: ordersRaw, error: ordersError } = await (supabase as any)
    .from('mips_orders')
    .select('id, student_id, order_type, amount, currency, description, status, mips_transaction_id, is_recurring, created_at, metadata')
    .order('created_at', { ascending: false })
    .limit(200)

  if (ordersError) {
    console.error('[admin/payments] orders fetch error:', ordersError)
  }

  const rawOrders = (ordersRaw ?? []) as MipsOrder[]

  // Fetch profiles separately — mips_orders.student_id → auth.users, not profiles
  const studentIds = [...new Set(rawOrders.map((o) => o.student_id))]
  let profileMap: Record<string, string | null> = {}
  if (studentIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', studentIds)
    for (const p of (profilesData ?? [])) {
      profileMap[(p as any).id] = (p as any).full_name ?? null
    }
  }

  const orders: MipsOrder[] = rawOrders.map((o) => ({
    ...o,
    studentName: profileMap[o.student_id] ?? null,
  }))

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

      <PaymentsTable initialOrders={orders} />
    </div>
  )
}

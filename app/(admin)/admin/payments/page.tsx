import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreditCard, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react'
import type { Metadata } from 'next'

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
  profiles: { full_name: string | null } | null
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  paid:      { label: 'Paid',      icon: CheckCircle2, className: 'text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400' },
  pending:   { label: 'Pending',   icon: Clock,        className: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 dark:text-yellow-400' },
  failed:    { label: 'Failed',    icon: XCircle,      className: 'text-red-500 bg-red-50 dark:bg-red-950/30' },
  cancelled: { label: 'Cancelled', icon: AlertCircle,  className: 'text-muted-foreground bg-muted/40' },
}

export default async function AdminPaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: ordersRaw } = await (supabase as any)
    .from('mips_orders')
    .select('id, student_id, order_type, amount, currency, description, status, mips_transaction_id, is_recurring, created_at, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(200)

  const orders = (ordersRaw ?? []) as MipsOrder[]

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

      {/* Orders table */}
      <div className="rounded-xl border border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[11px]">Transaction ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-sm">
                    No payment transactions yet.
                  </td>
                </tr>
              ) : orders.map((order) => {
                const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.failed
                const StatusIcon = cfg.icon
                const date = new Date(order.created_at)
                return (
                  <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      <div>{date.toLocaleDateString()}</div>
                      <div className="text-[11px]">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {order.profiles?.full_name ?? <span className="text-muted-foreground italic">Unknown</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                      {order.description ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted/60 font-medium capitalize">
                        {order.order_type}
                        {order.is_recurring && ' (recurring)'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                      {order.currency} {Number(order.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${cfg.className}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                      {order.mips_transaction_id ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

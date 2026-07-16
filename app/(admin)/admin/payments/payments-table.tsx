'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, Clock, AlertCircle, Zap, Filter } from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

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

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  paid:      { label: 'Paid',      icon: CheckCircle2, className: 'text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400' },
  pending:   { label: 'Pending',   icon: Clock,        className: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 dark:text-yellow-400' },
  failed:    { label: 'Failed',    icon: XCircle,      className: 'text-red-500 bg-red-50 dark:bg-red-950/30' },
  cancelled: { label: 'Cancelled', icon: AlertCircle,  className: 'text-muted-foreground bg-muted/40' },
}

export function PaymentsTable({ initialOrders, grades = [] }: { initialOrders: MipsOrder[]; grades?: { id: string; name: string }[] }) {
  const [orders, setOrders] = useState(initialOrders)
  const [activating, setActivating] = useState<string | null>(null)
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'not_paid'>('all')

  const visibleOrders = orders.filter((o) => {
    if (gradeFilter !== 'all' && o.gradeId !== gradeFilter) return false
    if (statusFilter === 'paid' && o.status !== 'paid') return false
    if (statusFilter === 'not_paid' && o.status === 'paid') return false
    return true
  })

  async function activate(orderId: string) {
    setActivating(orderId)
    try {
      const res = await fetch('/api/payment/admin-activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      const data = await res.json()
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: 'paid' } : o))
        )
      } else {
        alert(`Activation failed: ${data.error ?? 'Unknown error'}`)
      }
    } catch (err) {
      alert(`Network error: ${String(err)}`)
    } finally {
      setActivating(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        {grades.length > 0 && (
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Filter by grade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {grades.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'paid' | 'not_paid')}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="not_paid">Not paid</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-xl border border-border/60 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Grade</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-[11px]">Transaction ID</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {visibleOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground text-sm">
                  {gradeFilter !== 'all' || statusFilter !== 'all' ? 'No payment transactions match these filters.' : 'No payment transactions yet.'}
                </td>
              </tr>
            ) : visibleOrders.map((order) => {
              const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.failed
              const StatusIcon = cfg.icon
              const date = new Date(order.created_at)
              const canActivate = order.status === 'pending' || order.status === 'failed'
              return (
                <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    <div>{date.toLocaleDateString()}</div>
                    <div className="text-[11px]">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {order.studentName ?? <span className="text-muted-foreground italic">Unknown</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {order.gradeName ?? '—'}
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
                    {order.status === 'failed' && order.metadata?.failureReason && (
                      <p className="text-[11px] text-red-500 mt-1 max-w-[160px]">{order.metadata.failureReason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                    {order.mips_transaction_id ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {canActivate && (
                      <button
                        onClick={() => activate(order.id)}
                        disabled={activating === order.id}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors whitespace-nowrap"
                      >
                        <Zap className="w-3 h-3" />
                        {activating === order.id ? 'Activating…' : 'Activate'}
                      </button>
                    )}
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

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PrintButton } from './print-button'

export const metadata: Metadata = { title: 'Payment Receipt' }

interface PageProps {
  params: Promise<{ orderId: string }>
}

export default async function ReceiptPage({ params }: PageProps) {
  const { orderId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: orderRaw } = await (supabase as any)
    .from('mips_orders')
    .select('id, amount, currency, description, order_type, package_ids, status, created_at, metadata')
    .eq('id', orderId)
    .eq('student_id', user.id)
    .eq('status', 'paid')
    .single()

  if (!orderRaw) notFound()

  const order = orderRaw as {
    id: string
    amount: number
    currency: string
    description: string
    order_type: string
    package_ids: string[]
    status: string
    created_at: string
    metadata: { transaction_id?: string; payment_method?: string } | null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const receiptNo = order.id.replace(/-/g, '').slice(0, 10).toUpperCase()
  const date = new Date(order.created_at)
  const formattedDate = date.toLocaleDateString('en-MU', { dateStyle: 'long' })
  const formattedTime = date.toLocaleTimeString('en-MU', { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      {/* Print button — hidden when printing */}
      <div className="print:hidden flex items-center gap-3 mb-6 px-4 pt-4">
        <button
          onClick={() => history.back()}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </button>
        <div className="flex-1" />
        <PrintButton />
      </div>

      {/* Receipt */}
      <div className="max-w-xl mx-auto px-4 pb-12 print:px-0 print:pb-0 print:max-w-none">
        <div className="border border-border/60 rounded-2xl p-8 print:border-0 print:rounded-none print:p-0 space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight">LessonComputer.mu</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Official Payment Receipt</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Receipt No.</p>
              <p className="font-mono text-sm font-bold">{receiptNo}</p>
            </div>
          </div>

          <hr className="border-border/60" />

          {/* Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Billed to</p>
              <p className="font-medium">{profile?.full_name ?? user.email}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-0.5">Date</p>
              <p className="font-medium">{formattedDate}</p>
              <p className="text-xs text-muted-foreground">{formattedTime}</p>
            </div>
          </div>

          {/* Line items */}
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border/60">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Description</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-3">
                    <p className="font-medium">{order.description}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{order.order_type} subscription</p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {order.currency} {Number(order.amount).toFixed(2)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t border-border/60 bg-muted/10">
                  <td className="px-4 py-3 font-semibold text-sm">Total paid</td>
                  <td className="px-4 py-3 text-right font-bold text-primary text-base">
                    {order.currency} {Number(order.amount).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment info */}
          {(order.metadata?.transaction_id || order.metadata?.payment_method) && (
            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
              {order.metadata.transaction_id && (
                <div>
                  <p className="font-medium text-foreground mb-0.5">Transaction ID</p>
                  <p className="font-mono">{order.metadata.transaction_id}</p>
                </div>
              )}
              {order.metadata.payment_method && (
                <div>
                  <p className="font-medium text-foreground mb-0.5">Payment method</p>
                  <p className="capitalize">{order.metadata.payment_method}</p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="pt-2 border-t border-border/60 text-xs text-muted-foreground text-center">
            Thank you for your payment · lessoncomputer.mu
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white; }
          nav, header, aside, footer { display: none !important; }
        }
      `}</style>
    </>
  )
}

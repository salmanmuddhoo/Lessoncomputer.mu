import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, XCircle, Clock, ArrowRight, ShoppingCart } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Payment Result' }

interface PageProps {
  searchParams: Promise<{ orderId?: string; cancelled?: string }>
}

export default async function PaymentResultPage({ searchParams }: PageProps) {
  const { orderId, cancelled } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (!orderId) redirect('/dashboard')

  // Poll order status (MIPS may take a few seconds for the IMN callback)
  const { data: orderRaw } = await (supabase as any)
    .from('mips_orders')
    .select('id, status, amount, description, order_type')
    .eq('id', orderId)
    .eq('student_id', user.id)
    .single()

  const order = orderRaw as {
    id: string
    status: string
    amount: number
    description: string
    order_type: string
  } | null

  if (!order) redirect('/dashboard')

  const status = cancelled === '1' ? 'cancelled' : order.status

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {status === 'paid' ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-950/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold">Payment Successful</h1>
            <p className="text-muted-foreground text-sm">
              Your subscription has been activated. You can now access your content.
            </p>
            <div className="rounded-xl border border-border/60 p-4 text-sm text-left space-y-1">
              <p className="text-muted-foreground">Amount paid</p>
              <p className="text-xl font-bold text-primary">Rs {order.amount.toFixed(2)}</p>
            </div>
            <Link
              href={order.order_type === 'live' ? '/dashboard/live-classes' : '/dashboard/my-videos'}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-accent font-medium text-sm transition-colors"
            >
              Go to {order.order_type === 'live' ? 'Live Classes' : 'My Videos'}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : status === 'pending' ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-950/30 rounded-full flex items-center justify-center mx-auto">
              <Clock className="w-9 h-9 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h1 className="text-2xl font-bold">Processing Payment</h1>
            <p className="text-muted-foreground text-sm">
              Your payment is being processed. This page will refresh automatically.
            </p>
            <p className="text-xs text-muted-foreground">
              If your subscription is not activated within a few minutes, please contact support.
            </p>
            <Link
              href={`/payment/result?orderId=${orderId}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border hover:bg-muted/30 font-medium text-sm transition-colors"
            >
              Refresh Status
            </Link>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-9 h-9 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold">
              {status === 'cancelled' ? 'Payment Cancelled' : 'Payment Failed'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {status === 'cancelled'
                ? 'You cancelled the payment. No charge was made.'
                : 'Something went wrong with your payment. Please try again.'}
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border hover:bg-muted/30 font-medium text-sm transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

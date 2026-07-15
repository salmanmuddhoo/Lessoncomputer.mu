import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { BookOpen, ArrowRight, AlertTriangle } from 'lucide-react'
import type { Metadata } from 'next'
import { SubscriptionCard } from '@/components/lc/subscription-card'

export const metadata: Metadata = { title: 'My Subscriptions' }

export default async function StudentSubscriptionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [subsResult, ordersResult, failedResult] = await Promise.all([
    supabase
      .from('student_subscriptions')
      .select(`
        id,
        package_id,
        subscription_type,
        is_recurring,
        purchased_at,
        valid_from,
        valid_until,
        package:subscription_packages(
          id, name, month, year, price,
          grade:grades(slug, name, color)
        )
      `)
      .eq('student_id', user.id)
      .eq('status', 'active')
      .order('purchased_at', { ascending: false }),

    (supabase as any)
      .from('mips_orders')
      .select('id, package_ids, created_at')
      .eq('student_id', user.id)
      .eq('status', 'paid')
      .order('created_at', { ascending: false }),

    // Failed recurring charges — so the student knows a payment didn't go through
    (supabase as any)
      .from('mips_orders')
      .select('id, description, amount, currency, created_at, metadata')
      .eq('student_id', user.id)
      .eq('status', 'failed')
      .eq('is_recurring', true)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const activeSubs = ((subsResult.data ?? []) as any[]).filter((s) => s.package_id && s.package)
  const paidOrders = (ordersResult.data ?? []) as { id: string; package_ids: string[] }[]
  const failedOrders = (failedResult.data ?? []) as { id: string; description: string | null; amount: number; currency: string; created_at: string; metadata: { failureReason?: string } | null }[]

  // For each subscription, find its most recent paid order
  function findOrderId(packageId: string): string | null {
    const order = paidOrders.find((o) => Array.isArray(o.package_ids) && o.package_ids.includes(packageId))
    return order?.id ?? null
  }

  // Only the latest live recurring subscription should show the cancel button.
  // Past months are already over — cancelling them would have no effect.
  const latestLiveRecurringId = activeSubs
    .filter((s: any) => s.is_recurring && s.package?.month != null && s.package?.year != null)
    .sort((a: any, b: any) =>
      b.package.year !== a.package.year
        ? b.package.year - a.package.year
        : b.package.month - a.package.month
    )[0]?.id ?? null

  const today = new Date().toISOString().split('T')[0]

  function canResubscribeLive(sub: any): boolean {
    if (sub.subscription_type !== 'live') return false
    if (sub.is_recurring) return false
    // If another month is already recurring (e.g. next month was auto-renewed),
    // there's nothing to restore — the subscription is already active going forward.
    if (latestLiveRecurringId) return false
    // Only show re-subscribe for current/upcoming periods, not expired past months
    if (sub.valid_until && sub.valid_until < today) return false
    return true
  }

  // Each paid order shows its Receipt once, on its MOST CURRENT month (latest valid_until),
  // so renewing next month never hides the current month's receipt. Separate orders
  // (e.g. the initial purchase vs. a cron renewal) each keep their own receipt.
  const receiptForSub = new Map<string, string>()
  const seenReceiptOrders = new Set<string>()
  for (const sub of [...activeSubs].sort((a: any, b: any) => String(b.valid_until ?? '').localeCompare(String(a.valid_until ?? '')))) {
    const orderId = findOrderId(sub.package_id)
    if (orderId && !seenReceiptOrders.has(orderId)) {
      seenReceiptOrders.add(orderId)
      receiptForSub.set(sub.id, orderId)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">My Subscriptions</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Your active and upcoming subscriptions</p>
      </div>

      {/* Failed recurring payments */}
      {failedOrders.length > 0 && (
        <div className="mb-8 rounded-xl border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <h2 className="font-semibold text-sm text-red-600 dark:text-red-400">Payment issue</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            A recurring payment for your live classes could not be processed, so it was not renewed.
            Re-subscribe from your grade page to regain access.
          </p>
          <div className="space-y-2">
            {failedOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 text-xs bg-background/60 rounded-lg px-3 py-2 border border-red-200 dark:border-red-900/40">
                <div className="min-w-0">
                  <p className="font-medium truncate">{o.description ?? 'Live classes (auto-renewal)'}</p>
                  <p className="text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString('en-MU', { dateStyle: 'medium' })}
                    {o.metadata?.failureReason ? ` · ${o.metadata.failureReason}` : ''}
                  </p>
                </div>
                <span className="font-semibold text-red-500 shrink-0">Failed · {o.currency} {Number(o.amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubs.length === 0 ? (
        <div className="py-16 text-center rounded-xl border border-border/60">
          <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No active subscriptions</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Browse grades to subscribe to live classes or buy video packages.
          </p>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-accent">
            <Link href="/grades">Browse Grades <ArrowRight className="ml-2 w-4 h-4" /></Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {activeSubs.map((sub: any) => (
            <SubscriptionCard
              key={sub.id}
              id={sub.id}
              packageId={sub.package_id}
              subscriptionType={sub.subscription_type ?? 'video'}
              isRecurring={sub.is_recurring ?? false}
              canCancelRecurring={sub.id === latestLiveRecurringId}
              canResubscribe={canResubscribeLive(sub)}
              gradeSlug={sub.package?.grade?.slug ?? null}
              purchasedAt={sub.purchased_at}
              pkg={sub.package}
              orderId={receiptForSub.get(sub.id) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  )
}

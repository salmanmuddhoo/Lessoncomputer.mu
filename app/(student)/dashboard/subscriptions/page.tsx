import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { BookOpen, ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'
import { SubscriptionCard } from '@/components/lc/subscription-card'

export const metadata: Metadata = { title: 'My Subscriptions' }

export default async function StudentSubscriptionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: subs } = await supabase
    .from('student_subscriptions')
    .select(`
      id,
      package_id,
      subscription_type,
      is_recurring,
      purchased_at,
      package:subscription_packages(
        id, name, month, year, price,
        grade:grades(slug, name, color)
      )
    `)
    .eq('student_id', user.id)
    .eq('status', 'active')
    .order('purchased_at', { ascending: false })

  const activeSubs = (subs ?? []).filter((s: any) => s.package_id && s.package)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">My Subscriptions</h1>
        <p className="text-muted-foreground text-sm mt-0.5">All your active subscriptions</p>
      </div>

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
              purchasedAt={sub.purchased_at}
              pkg={sub.package}
            />
          ))}
        </div>
      )}
    </div>
  )
}

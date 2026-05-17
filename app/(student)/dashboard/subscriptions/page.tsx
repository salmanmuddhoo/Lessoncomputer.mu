import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Package, Radio, ArrowRight, BookOpen } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My Subscriptions' }

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

export default async function StudentSubscriptionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: subs } = await supabase
    .from('student_subscriptions')
    .select(`
      id,
      subscription_type,
      purchased_at,
      expires_at,
      package:subscription_packages(
        id, name, month, year, package_type, price
      )
    `)
    .eq('student_id', user.id)
    .eq('status', 'active')
    .order('purchased_at', { ascending: false })

  const activeSubs = (subs ?? []).filter((s: any) => s.package !== null)

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
          {activeSubs.map((sub: any) => {
            const pkg = sub.package
            const isLive = sub.subscription_type === 'live' || pkg?.package_type === 'live_month'
            const monthLabel = pkg?.month && pkg?.year
              ? `${MONTHS[pkg.month - 1]} ${pkg.year}`
              : null
            const href = isLive ? '/dashboard/live-classes' : '/dashboard/my-videos'

            return (
              <Link
                key={sub.id}
                href={href}
                className="flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card hover:border-primary/30 hover:bg-muted/20 transition-colors group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isLive ? 'bg-primary/10' : 'bg-muted'
                }`}>
                  {isLive
                    ? <Radio className="w-5 h-5 text-primary" />
                    : <Package className="w-5 h-5 text-muted-foreground" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-semibold text-sm truncate">{pkg?.name ?? 'Package'}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs shrink-0 ${isLive ? 'text-primary border-primary/30 bg-primary/5' : ''}`}
                    >
                      {isLive ? 'Live Classes' : 'Video Package'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {monthLabel && <span>{monthLabel}</span>}
                    <span>Purchased {new Date(sub.purchased_at).toLocaleDateString('en-MU', { dateStyle: 'medium' })}</span>
                    {sub.expires_at && (
                      <span>· Expires {new Date(sub.expires_at).toLocaleDateString('en-MU', { dateStyle: 'medium' })}</span>
                    )}
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

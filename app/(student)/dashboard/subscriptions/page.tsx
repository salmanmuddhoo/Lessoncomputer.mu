import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Package, CheckCircle2, Lock, RefreshCw } from 'lucide-react'
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('grade_id, grade:grades(id, name, color, slug)')
    .eq('id', user.id)
    .single()

  const grade = profile?.grade as { id: string; name: string; color: string; slug: string } | null

  if (!grade) {
    return (
      <div className="py-20 text-center">
        <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="font-semibold mb-2">No grade selected</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Set your grade in account settings to see subscription packages.
        </p>
        <Button asChild size="sm">
          <Link href="/dashboard/account">Go to Account Settings</Link>
        </Button>
      </div>
    )
  }

  // All active packages for this grade
  const { data: allPackages } = await supabase
    .from('subscription_packages')
    .select('*, subscription_package_chapters(chapter_id, chapter:chapters(id, title, order_index))')
    .eq('grade_id', grade.id)
    .eq('is_active', true)
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  // Student's active subscriptions
  const { data: mySubs } = await supabase
    .from('student_subscriptions')
    .select('package_id, is_recurring, purchased_at')
    .eq('student_id', user.id)
    .eq('status', 'active')

  const subscribedMap = new Map(
    (mySubs ?? []).map((s: any) => [s.package_id, s])
  )

  const subscribed = (allPackages ?? []).filter((p: any) => subscribedMap.has(p.id))
  const available = (allPackages ?? []).filter((p: any) => !subscribedMap.has(p.id))

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  function isCurrentOrFuture(pkg: any) {
    return pkg.year > currentYear || (pkg.year === currentYear && pkg.month >= currentMonth)
  }

  function getChapters(pkg: any) {
    return (pkg.subscription_package_chapters ?? [])
      .map((spc: any) => spc.chapter)
      .filter(Boolean)
      .sort((a: any, b: any) => a.order_index - b.order_index)
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">My Subscriptions</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Packages for{' '}
          <span className="font-medium" style={{ color: grade.color }}>{grade.name}</span>
        </p>
      </div>

      {/* Active subscriptions */}
      {subscribed.length > 0 && (
        <section className="mb-10">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Active Subscriptions
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subscribed.map((pkg: any) => {
              const sub = subscribedMap.get(pkg.id)
              const chapters = getChapters(pkg)
              return (
                <div
                  key={pkg.id}
                  className="rounded-xl border border-primary/30 bg-primary/5 flex flex-col overflow-hidden"
                >
                  <div className="p-5 flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold leading-snug">{pkg.name}</h3>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {MONTHS[pkg.month - 1]} {pkg.year}
                      </Badge>
                    </div>
                    {sub?.is_recurring && (
                      <div className="flex items-center gap-1 text-xs text-primary mb-2">
                        <RefreshCw className="w-3 h-3" /> Recurring
                      </div>
                    )}
                    {pkg.description && (
                      <p className="text-sm text-muted-foreground mb-3">{pkg.description}</p>
                    )}
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">
                      {chapters.length} chapter{chapters.length !== 1 ? 's' : ''} included:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {chapters.map((ch: any) => (
                        <Badge key={ch.id} variant="secondary" className="text-xs">{ch.title}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="px-5 py-3 border-t border-primary/20 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Since {new Date(sub?.purchased_at).toLocaleDateString('en-MU', { dateStyle: 'medium' })}
                    </span>
                    <Button size="sm" variant="outline" asChild className="h-7 text-xs px-3">
                      <Link href={`/grades/${grade.slug}`}>Watch Videos</Link>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Available packages */}
      {available.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            Available Packages
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {available.map((pkg: any) => {
              const chapters = getChapters(pkg)
              const current = isCurrentOrFuture(pkg)
              return (
                <div
                  key={pkg.id}
                  className="rounded-xl border border-border/60 bg-card flex flex-col overflow-hidden hover:border-primary/30 transition-colors"
                >
                  <div className="p-5 flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold leading-snug">{pkg.name}</h3>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {MONTHS[pkg.month - 1]} {pkg.year}
                        </Badge>
                        {current && (
                          <Badge className="text-xs bg-primary/10 text-primary border-primary/20" variant="outline">
                            Current
                          </Badge>
                        )}
                      </div>
                    </div>
                    {pkg.description && (
                      <p className="text-sm text-muted-foreground mb-3">{pkg.description}</p>
                    )}
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">
                      {chapters.length} chapter{chapters.length !== 1 ? 's' : ''} included:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {chapters.map((ch: any) => (
                        <Badge key={ch.id} variant="secondary" className="text-xs">
                          <Lock className="w-2.5 h-2.5 mr-1" />{ch.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="px-5 py-4 border-t border-border/60 flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">Rs {Number(pkg.price).toFixed(2)}</span>
                    <Button size="sm" asChild className="bg-primary text-primary-foreground hover:bg-accent">
                      <Link href="/contact">Subscribe</Link>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            To subscribe, click Subscribe and contact us via the form. Your access will be activated once payment is confirmed.
          </p>
        </section>
      )}

      {subscribed.length === 0 && available.length === 0 && (
        <div className="py-20 text-center rounded-xl border border-border/60">
          <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No subscription packages available for {grade.name} yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Check back soon.</p>
        </div>
      )}
    </div>
  )
}

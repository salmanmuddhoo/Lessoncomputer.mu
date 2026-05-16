import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Package, CheckCircle2, Lock, Radio, Video,
  ShoppingBag, ArrowRight, BookOpen,
} from 'lucide-react'
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
    .select('grade_id, grade:grades(id, name, color, slug, live_subscription_enabled, live_subscription_price)')
    .eq('id', user.id)
    .single()

  const grade = profile?.grade as {
    id: string; name: string; color: string; slug: string
    live_subscription_enabled: boolean; live_subscription_price: number
  } | null

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

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const [
    { data: livePackages },
    { data: videoPackages },
    { data: mySubs },
  ] = await Promise.all([
    supabase
      .from('subscription_packages')
      .select('id, name, price, month, year, description, subscription_package_chapters(chapter_id, chapter:chapters(id, title, order_index))')
      .eq('grade_id', grade.id)
      .eq('package_type', 'live_month')
      .eq('is_active', true)
      .order('year', { ascending: false })
      .order('month', { ascending: false }),
    supabase
      .from('subscription_packages')
      .select('id, name, price, description, expires_days, subscription_package_chapters(chapter_id, chapter:chapters(id, title, order_index))')
      .eq('grade_id', grade.id)
      .or('package_type.eq.video,package_type.is.null')
      .eq('is_active', true)
      .order('name', { ascending: true }),
    supabase
      .from('student_subscriptions')
      .select('package_id, subscription_type, purchased_at, expires_at')
      .eq('student_id', user.id)
      .eq('status', 'active'),
  ])

  const subscribedPackageIds = new Set((mySubs ?? []).map((s: any) => s.package_id).filter(Boolean))
  const subsByPackage = new Map((mySubs ?? []).map((s: any) => [s.package_id, s]))

  function getChapters(pkg: any) {
    return (pkg.subscription_package_chapters ?? [])
      .map((spc: any) => spc.chapter)
      .filter(Boolean)
      .sort((a: any, b: any) => a.order_index - b.order_index)
  }

  const currentLivePkg = (livePackages ?? []).find(
    (p: any) => p.month === currentMonth && p.year === currentYear
  )
  const pastLivePkgs = (livePackages ?? []).filter(
    (p: any) => !(p.month === currentMonth && p.year === currentYear)
  )

  const subscribedVideoPackages = (videoPackages ?? []).filter((p: any) => subscribedPackageIds.has(p.id))
  const availableVideoPackages = (videoPackages ?? []).filter((p: any) => !subscribedPackageIds.has(p.id))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">My Subscriptions</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Live classes &amp; video packages for{' '}
          <span className="font-medium" style={{ color: grade.color }}>{grade.name}</span>
        </p>
      </div>

      {/* ── LIVE CLASSES SECTION ── */}
      {grade.live_subscription_enabled && (
        <section className="mb-10">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" />
            Live Classes
          </h2>

          {/* Current month */}
          {currentLivePkg ? (
            <div className="mb-4">
              {(() => {
                const isSubscribed = subscribedPackageIds.has(currentLivePkg.id)
                const sub = subsByPackage.get(currentLivePkg.id)
                const chapters = getChapters(currentLivePkg)
                const monthLabel = `${MONTHS[currentLivePkg.month - 1]} ${currentLivePkg.year}`
                return (
                  <div className={`rounded-xl border overflow-hidden ${
                    isSubscribed ? 'border-primary/30 bg-primary/5' : 'border-primary/20 bg-card'
                  }`}>
                    <div className="p-5 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Radio className="w-4 h-4 text-primary shrink-0" />
                          <span className="font-bold">{monthLabel}</span>
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                            Current Month
                          </Badge>
                        </div>
                        {currentLivePkg.description && (
                          <p className="text-sm text-muted-foreground mb-2">{currentLivePkg.description}</p>
                        )}
                        {chapters.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {chapters.map((ch: any) => (
                              <Badge key={ch.id} variant="secondary" className="text-xs">{ch.title}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right flex flex-col items-end gap-2">
                        <span className="text-lg font-bold text-primary">
                          Rs {Number(grade.live_subscription_price).toFixed(2)}
                          <span className="text-sm font-normal text-muted-foreground">/mo</span>
                        </span>
                        {isSubscribed ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Subscribed
                            </span>
                            {sub?.expires_at && (
                              <span className="text-xs text-muted-foreground">
                                Until {new Date(sub.expires_at).toLocaleDateString('en-MU', { dateStyle: 'medium' })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-accent">
                            <Link href={`/contact?type=live&package=${currentLivePkg.id}&month=${encodeURIComponent(monthLabel)}`}>
                              <Radio className="w-4 h-4 mr-2" />
                              Subscribe
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                    {isSubscribed && (
                      <div className="px-5 py-3 border-t border-primary/20 flex justify-end">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/grades/${grade.slug}`}>
                            View Content <ArrowRight className="ml-2 w-3 h-3" />
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          ) : (
            <div className="mb-4 p-5 rounded-xl border border-border/60 bg-card text-sm text-muted-foreground">
              <Radio className="w-4 h-4 inline-block mr-2 text-muted-foreground/60" />
              Live classes for {MONTHS[currentMonth - 1]} {currentYear} haven&apos;t been published yet. Check back soon.
            </div>
          )}

          {/* Previous months */}
          {pastLivePkgs.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <ShoppingBag className="w-3.5 h-3.5" />
                Previous Months
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pastLivePkgs.map((pkg: any) => {
                  const isSubscribed = subscribedPackageIds.has(pkg.id)
                  const monthLabel = `${MONTHS[pkg.month - 1]} ${pkg.year}`
                  const chapters = getChapters(pkg)
                  return (
                    <div
                      key={pkg.id}
                      className={`rounded-xl border overflow-hidden flex flex-col ${
                        isSubscribed ? 'border-primary/30 bg-primary/5' : 'border-border/60 bg-card'
                      }`}
                    >
                      <div className="p-4 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          {isSubscribed
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                            : <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          }
                          <span className="font-semibold text-sm">{monthLabel}</span>
                        </div>
                        {chapters.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {chapters.map((ch: any) => (
                              <Badge key={ch.id} variant="secondary" className="text-xs">
                                {!isSubscribed && <Lock className="w-2.5 h-2.5 mr-1" />}
                                {ch.title}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="px-4 py-3 border-t border-border/40 flex items-center justify-between">
                        <span className="text-sm font-bold text-primary">
                          Rs {Number(grade.live_subscription_price).toFixed(2)}
                        </span>
                        {isSubscribed ? (
                          <span className="text-xs text-primary font-medium">Purchased</span>
                        ) : (
                          <Button asChild size="sm" variant="outline" className="h-7 text-xs px-3">
                            <Link href={`/contact?type=live&package=${pkg.id}&month=${encodeURIComponent(monthLabel)}`}>
                              Buy
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </section>
      )}

      {/* ── VIDEO PACKAGES SECTION ── */}
      <section className="mb-10">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Video className="w-4 h-4 text-primary" />
          Video Packages
        </h2>

        {/* Subscribed video packages */}
        {subscribedVideoPackages.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
            {subscribedVideoPackages.map((pkg: any) => {
              const chapters = getChapters(pkg)
              const sub = subsByPackage.get(pkg.id)
              return (
                <div
                  key={pkg.id}
                  className="rounded-xl border border-primary/30 bg-primary/5 flex flex-col overflow-hidden"
                >
                  <div className="p-5 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="w-4 h-4 text-primary shrink-0" />
                      <h3 className="font-semibold text-sm leading-snug">{pkg.name}</h3>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs text-primary font-medium mb-2">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Purchased
                    </span>
                    {pkg.description && (
                      <p className="text-sm text-muted-foreground mb-3">{pkg.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {chapters.map((ch: any) => (
                        <Badge key={ch.id} variant="secondary" className="text-xs">{ch.title}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="px-5 py-3 border-t border-primary/20 flex items-center justify-between">
                    {sub?.expires_at ? (
                      <span className="text-xs text-muted-foreground">
                        Until {new Date(sub.expires_at).toLocaleDateString('en-MU', { dateStyle: 'medium' })}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">No expiry</span>
                    )}
                    <Button size="sm" variant="outline" asChild className="h-7 text-xs px-3">
                      <Link href={`/grades/${grade.slug}`}>Watch</Link>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Available video packages */}
        {availableVideoPackages.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {availableVideoPackages.map((pkg: any) => {
              const chapters = getChapters(pkg)
              return (
                <div
                  key={pkg.id}
                  className="rounded-xl border border-border/60 bg-card flex flex-col overflow-hidden hover:border-primary/30 transition-colors"
                >
                  <div className="p-5 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                      <h3 className="font-semibold text-sm leading-snug">{pkg.name}</h3>
                    </div>
                    {pkg.description && (
                      <p className="text-sm text-muted-foreground mb-3">{pkg.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {chapters.map((ch: any) => (
                        <Badge key={ch.id} variant="secondary" className="text-xs">
                          <Lock className="w-2.5 h-2.5 mr-1" />{ch.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="px-5 py-3 border-t border-border/60 flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">
                      Rs {Number(pkg.price).toFixed(2)}
                    </span>
                    <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-accent h-8">
                      <Link href={`/contact?type=video&package=${pkg.id}`}>
                        Buy
                      </Link>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {subscribedVideoPackages.length === 0 && availableVideoPackages.length === 0 && (
          <div className="py-12 text-center rounded-xl border border-border/60">
            <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No video packages available for {grade.name} yet.</p>
          </div>
        )}
      </section>
    </div>
  )
}

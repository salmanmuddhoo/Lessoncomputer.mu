import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Radio, ExternalLink, Lock, CheckCircle2,
  Calendar, ArrowRight, BookOpen,
} from 'lucide-react'
import { LiveClassSchedule } from '@/components/lc/live-class-schedule'
import { LiveMonthChapters } from '@/components/lc/live-month-chapters'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Live Classes' }

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

export default async function StudentLiveClassesPage() {
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
        <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="font-semibold mb-2">No grade selected</h2>
        <p className="text-sm text-muted-foreground mb-5">Set your grade in account settings.</p>
        <Button asChild size="sm"><Link href="/dashboard/account">Account Settings</Link></Button>
      </div>
    )
  }

  if (!grade.live_subscription_enabled) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Live Classes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Monthly live sessions for {grade.name}</p>
        </div>
        <div className="py-16 text-center rounded-xl border border-border/60">
          <Radio className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">Live classes are not yet available for {grade.name}.</p>
        </div>
      </div>
    )
  }

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

  const [{ data: livePackages }, { data: subs }, { data: currentLiveClass }] = await Promise.all([
    supabase
      .from('subscription_packages')
      .select('id, name, month, year, subscription_package_chapters(chapter_id, chapter:chapters(id, title, description, order_index))')
      .eq('grade_id', grade.id)
      .eq('package_type', 'live_month')
      .eq('is_active', true)
      .order('year', { ascending: false })
      .order('month', { ascending: false }),
    supabase
      .from('student_subscriptions')
      .select('package_id, purchased_at')
      .eq('student_id', user.id)
      .eq('status', 'active'),
    supabase
      .from('live_classes')
      .select('id, title, meet_url, scheduled_at, is_recurring, recurrence_day_of_week, end_time')
      .eq('grade_id', grade.id)
      .eq('is_published', true)
      .gte('scheduled_at', monthStart)
      .lt('scheduled_at', monthEnd)
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  const subscribedPackageIds = new Set((subs ?? []).map((s: any) => s.package_id).filter(Boolean))

  const currentMonthPkg = (livePackages ?? []).find(
    (p: any) => p.month === currentMonth && p.year === currentYear
  )
  const isSubscribedCurrentMonth = currentMonthPkg ? subscribedPackageIds.has(currentMonthPkg.id) : false

  // Fetch content for subscribed packages only
  const subscribedChapterIds = (livePackages ?? [])
    .filter((p: any) => subscribedPackageIds.has(p.id))
    .flatMap((p: any) => (p.subscription_package_chapters ?? []).map((c: any) => c.chapter_id))

  const videosByChapter: Record<string, any[]> = {}
  const documentsByChapter: Record<string, any[]> = {}

  if (subscribedChapterIds.length > 0) {
    const [{ data: videos }, { data: docs }] = await Promise.all([
      supabase.from('videos').select('*').in('chapter_id', subscribedChapterIds).eq('is_published', true),
      supabase.from('documents').select('*').in('chapter_id', subscribedChapterIds).eq('is_published', true),
    ])
    for (const v of videos ?? []) {
      videosByChapter[v.chapter_id] ??= []
      videosByChapter[v.chapter_id].push(v)
    }
    for (const d of docs ?? []) {
      documentsByChapter[d.chapter_id] ??= []
      documentsByChapter[d.chapter_id].push(d)
    }
  }

  const hasAnyContent = (livePackages ?? []).length > 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Live Classes</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Monthly live sessions for <span className="font-medium" style={{ color: grade.color }}>{grade.name}</span>
        </p>
      </div>

      {/* Join banner — only when subscribed to current month */}
      {isSubscribedCurrentMonth && (
        <div className="mb-8 p-5 rounded-xl border border-primary/30 bg-primary/5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Radio className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                {MONTHS[currentMonth - 1]} {currentYear} — Active
              </span>
            </div>
            {currentLiveClass ? (
              <>
                <h3 className="font-semibold text-sm mb-1">{currentLiveClass.title}</h3>
                <div className="text-sm text-muted-foreground">
                  <LiveClassSchedule
                    scheduledAt={currentLiveClass.scheduled_at}
                    isRecurring={currentLiveClass.is_recurring ?? false}
                    recurrenceDayOfWeek={currentLiveClass.recurrence_day_of_week ?? null}
                    endTime={currentLiveClass.end_time ?? null}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Live class schedule not published yet.</p>
            )}
          </div>
          {currentLiveClass?.meet_url ? (
            <a
              href={currentLiveClass.meet_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-accent text-sm font-semibold transition-colors shrink-0"
            >
              <ExternalLink className="w-4 h-4" />
              Join Live Class
            </a>
          ) : (
            <Badge variant="secondary" className="shrink-0">Link coming soon</Badge>
          )}
        </div>
      )}

      {/* Current month — not subscribed yet */}
      {!isSubscribedCurrentMonth && currentMonthPkg && (
        <div className="mb-8 p-5 rounded-xl border border-border/60 bg-card flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Radio className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                {MONTHS[currentMonth - 1]} {currentYear} — Current Month
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Subscribe to join this month's live classes and access content.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-lg font-bold text-primary">
              Rs {Number(grade.live_subscription_price).toFixed(2)}<span className="text-sm font-normal text-muted-foreground">/mo</span>
            </span>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-accent">
              <Link href={`/contact?type=live&package=${currentMonthPkg.id}&month=${encodeURIComponent(`${MONTHS[currentMonth - 1]} ${currentYear}`)}`}>
                <Radio className="w-4 h-4 mr-2" /> Subscribe
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* All months */}
      {!hasAnyContent ? (
        <div className="py-16 text-center rounded-xl border border-border/60">
          <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No monthly packages published yet for {grade.name}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(livePackages ?? []).map((pkg: any) => {
            const isSubscribed = subscribedPackageIds.has(pkg.id)
            const isCurrentMonth = pkg.month === currentMonth && pkg.year === currentYear
            const isPast = pkg.year < currentYear || (pkg.year === currentYear && pkg.month < currentMonth)
            const monthLabel = `${MONTHS[pkg.month - 1]} ${pkg.year}`

            const chapters = (pkg.subscription_package_chapters ?? [])
              .map((c: any) => c.chapter)
              .filter(Boolean)
              .sort((a: any, b: any) => a.order_index - b.order_index)

            return (
              <div
                key={pkg.id}
                className={`rounded-2xl border overflow-hidden ${
                  isSubscribed ? 'border-primary/30' : 'border-border/60'
                }`}
              >
                {/* Month header */}
                <div className={`px-5 py-4 flex items-center justify-between gap-4 ${
                  isSubscribed ? 'bg-primary/5' : 'bg-card'
                }`}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold">{monthLabel}</span>
                    {isCurrentMonth && (
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                        Current
                      </Badge>
                    )}
                    {isSubscribed && (
                      <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Subscribed
                      </span>
                    )}
                    {!isSubscribed && isPast && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Lock className="w-2.5 h-2.5" /> Past month
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {!isSubscribed && (
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold text-primary">
                        Rs {Number(grade.live_subscription_price).toFixed(2)}
                      </span>
                      <Button
                        asChild
                        size="sm"
                        variant={isPast ? 'outline' : 'default'}
                        className={isPast ? '' : 'bg-primary text-primary-foreground hover:bg-accent'}
                      >
                        <Link href={`/contact?type=live&package=${pkg.id}&month=${encodeURIComponent(monthLabel)}`}>
                          {isPast ? 'Buy Videos' : 'Subscribe'}
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Content for subscribed months */}
                {isSubscribed && (
                  <div className="px-5 pb-5">
                    {isPast && !isCurrentMonth && (
                      <p className="text-xs text-muted-foreground mt-3 mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Live classes for this month have ended — videos and documents are still accessible.
                      </p>
                    )}
                    <LiveMonthChapters
                      chapters={chapters}
                      videosByChapter={videosByChapter}
                      documentsByChapter={documentsByChapter}
                    />
                  </div>
                )}

                {/* Locked preview for non-subscribed past months */}
                {!isSubscribed && isPast && chapters.length > 0 && (
                  <div className="px-5 py-3 border-t border-border/40">
                    <p className="text-xs text-muted-foreground">
                      Includes: {chapters.map((ch: any) => ch.title).join(' · ')}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* CTA if no subscriptions at all */}
      {(livePackages ?? []).length > 0 && [...subscribedPackageIds].length === 0 && (
        <div className="mt-8 p-5 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-semibold">Start with this month</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Subscribe to get access to live classes and all monthly content for {grade.name}.
            </p>
          </div>
          <Button asChild className="shrink-0 bg-primary text-primary-foreground hover:bg-accent">
            <Link href={`/grades/${grade.slug}`}>
              View Grade Page <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}

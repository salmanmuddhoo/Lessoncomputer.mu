import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { GradePageContent } from '@/components/lc/grade-page-content'
import { BuySubscribeDialog } from '@/components/lc/buy-subscribe-dialog'
import { LiveClassSchedule } from '@/components/lc/live-class-schedule'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Video, Users, Package, Clock, Radio, AlertCircle, RefreshCw } from 'lucide-react'
import { getBillingSettings, getTargetMonth } from '@/lib/subscription-billing'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: grade } = await supabase
    .from('grades')
    .select('name, description')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!grade) return { title: 'Grade Not Found' }

  const title = `${grade.name} Video Lessons | LessonComputer.mu`
  const description =
    grade.description ??
    `Explore ${grade.name} video lessons and live classes on LessonComputer.mu — Mauritius's online learning platform.`

  return {
    title,
    description,
    openGraph: { title, description, type: 'website', siteName: 'LessonComputer.mu' },
    twitter: { card: 'summary', title, description },
  }
}

export default async function GradePage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

  const { data: grade } = await supabase
    .from('grades')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!grade) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // Determine which month to sell based on enrollment cutoff
  const billing = await getBillingSettings(supabase)
  const target = getTargetMonth(now, billing.cutoffDay)
  const afterCutoff = !target.isCurrentMonth

  // Next calendar month (used to offer re-subscribe when current month is already subscribed)
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const nextMonthNum = nextMonthDate.getMonth() + 1
  const nextMonthYear = nextMonthDate.getFullYear()

  const [
    { data: videos },
    { data: liveClasses },
    { data: chapters },
    { data: rawPackages },
    { data: documents },
    { data: currentLivePackage },
    { data: pastLivePackages },
    { data: nextMonthLivePackage },
  ] = await Promise.all([
    supabase
      .from('videos')
      .select('*, grade:grades(*), chapter:chapters(*)')
      .eq('grade_id', grade.id)
      .eq('is_published', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('live_classes')
      .select('*, grade:grades(*)')
      .eq('grade_id', grade.id)
      .eq('is_published', true)
      .gte('scheduled_at', monthStart)
      .lt('scheduled_at', monthEnd)
      .order('scheduled_at', { ascending: true }),
    supabase
      .from('chapters')
      .select('*')
      .eq('grade_id', grade.id)
      .order('order_index'),
    supabase
      .from('subscription_packages')
      .select('id, name, description, price, expires_days, subscription_package_chapters(chapter_id)')
      .eq('grade_id', grade.id)
      .eq('is_active', true)
      .or('package_type.eq.video,package_type.is.null')
      .order('name', { ascending: true }),
    supabase
      .from('documents')
      .select('id, title, description, chapter_id, file_url, file_name')
      .eq('grade_id', grade.id)
      .eq('is_published', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('subscription_packages')
      .select('id, name, price, month, year, subscription_package_chapters(chapter_id)')
      .eq('grade_id', grade.id)
      .eq('package_type', 'live_month')
      .eq('month', target.month)
      .eq('year', target.year)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('subscription_packages')
      .select('id, name, month, year')
      .eq('grade_id', grade.id)
      .eq('package_type', 'live_month')
      .eq('is_active', true)
      .or(`year.lt.${target.year},and(year.eq.${target.year},month.lt.${target.month})`)
      .order('year', { ascending: false })
      .order('month', { ascending: false }),
    supabase
      .from('subscription_packages')
      .select('id, name, month, year')
      .eq('grade_id', grade.id)
      .eq('package_type', 'live_month')
      .eq('month', nextMonthNum)
      .eq('year', nextMonthYear)
      .eq('is_active', true)
      .maybeSingle(),
  ])

  let subscribedVideoPackageIds: string[] = []
  let subscribedLivePackageIds: string[] = []
  let isLiveSubscribed = false
  let isNextMonthSubscribed = false
  let hasRecurringLive = false

  if (user) {
    const today = new Date().toISOString().split('T')[0]!
    // No date filter — we need all active subs including upcoming ones for the recurring check
    const { data: subs } = await supabase
      .from('student_subscriptions')
      .select('package_id, is_recurring, valid_from, valid_until')
      .eq('student_id', user.id)
      .eq('status', 'active')
      .not('package_id', 'is', null)

    const videoPackageIds = new Set((rawPackages ?? []).map((p: any) => p.id))
    const pastLiveIds = new Set((pastLivePackages ?? []).map((p: any) => p.id))
    // All live package IDs for this grade (past + current/next target month + next calendar month)
    const allGradeLiveIds = new Set([
      ...Array.from(pastLiveIds),
      ...((currentLivePackage as any)?.id ? [(currentLivePackage as any).id] : []),
      ...((nextMonthLivePackage as any)?.id ? [(nextMonthLivePackage as any).id] : []),
    ])

    for (const s of subs ?? []) {
      if (!s.package_id) continue

      // Apply date gate in JS for video/content access
      const accessible = (!s.valid_from || s.valid_from <= today) && (!s.valid_until || s.valid_until >= today)

      if (accessible) {
        if (videoPackageIds.has(s.package_id)) subscribedVideoPackageIds.push(s.package_id)
        if (currentLivePackage && s.package_id === (currentLivePackage as any).id) {
          isLiveSubscribed = true
          subscribedLivePackageIds.push(s.package_id)
        }
      }

      // A past live month the student already PAID for must not be offered for
      // re-purchase in "Also add past months" — this is independent of the date gate
      // (a past month's access window has closed, so it is not "accessible" today).
      if (pastLiveIds.has(s.package_id)) subscribedLivePackageIds.push(s.package_id)

      // Track next month subscription (accessible or upcoming)
      if (nextMonthLivePackage && s.package_id === (nextMonthLivePackage as any).id) {
        isNextMonthSubscribed = true
        subscribedLivePackageIds.push(s.package_id)
      }

      // Recurring check has no date gate — an upcoming recurring sub still blocks a new purchase
      if ((s as any).is_recurring && allGradeLiveIds.has(s.package_id)) {
        hasRecurringLive = true
      }
    }
  }

  const videosByChapter: Record<string, any[]> = {}
  const unchapteredVideos: any[] = []

  for (const v of videos ?? []) {
    if (v.chapter_id) {
      videosByChapter[v.chapter_id] ??= []
      videosByChapter[v.chapter_id]!.push(v)
    } else {
      unchapteredVideos.push(v)
    }
  }

  const packages = (rawPackages ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    expires_days: p.expires_days ?? null,
    chapterIds: (p.subscription_package_chapters ?? []).map((c: any) => c.chapter_id),
  }))

  const documentsByChapter: Record<string, any[]> = {}
  for (const d of documents ?? []) {
    if (d.chapter_id) {
      documentsByChapter[d.chapter_id] ??= []
      documentsByChapter[d.chapter_id]!.push(d)
    }
  }

  const totalVideos = videos?.length ?? 0
  const hasPackages = packages.length > 0
  const liveSubscriptionEnabled = (grade as any).live_subscription_enabled ?? false
  const liveSubscriptionPrice = (grade as any).live_subscription_price ?? 0

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const liveMonthLabel = currentLivePackage
    ? `${MONTHS[(currentLivePackage as any).month - 1]} ${(currentLivePackage as any).year}`
    : `${MONTHS[target.month - 1]} ${target.year}`
  const closedMonthLabel = afterCutoff ? `${MONTHS[currentMonth - 1]} ${currentYear}` : null

  const liveMonthChapterIds: string[] = isLiveSubscribed && currentLivePackage
    ? ((currentLivePackage as any).subscription_package_chapters ?? []).map((c: any) => c.chapter_id)
    : []

  const dialogPackageList = packages.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    chapterCount: p.chapterIds.length,
  }))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0"
            style={{ backgroundColor: `${grade.color}20`, color: grade.color }}
          >
            {grade.name.replace('Grade ', '')}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold leading-tight">{grade.name}</h1>
            {grade.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{grade.description}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1">
            <Video className="w-3 h-3" />
            {totalVideos} {totalVideos === 1 ? 'video' : 'videos'}
          </Badge>
          {(chapters?.length ?? 0) > 0 && (
            <Badge variant="secondary" className="gap-1">
              <BookOpen className="w-3 h-3" />
              {chapters!.length} {chapters!.length === 1 ? 'chapter' : 'chapters'}
            </Badge>
          )}
          {hasPackages && (
            <Badge variant="secondary" className="gap-1">
              <Package className="w-3 h-3" />
              {packages.length} video {packages.length === 1 ? 'package' : 'packages'}
            </Badge>
          )}
        </div>
      </header>

      {/* Live class subscription banner */}
      {liveSubscriptionEnabled && (
        <div className="mb-8 space-y-3">
          {/* Enrollment closed notice */}
          {afterCutoff && closedMonthLabel && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Enrolment for <strong>{closedMonthLabel}</strong> is now closed.
                Subscribe below for <strong>{liveMonthLabel}</strong> — access begins 1&nbsp;{liveMonthLabel}.
              </span>
            </div>
          )}

          <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Radio className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                  Live Classes — {liveMonthLabel}
                  {afterCutoff && <span className="ml-2 normal-case font-normal text-muted-foreground">(upcoming)</span>}
                </span>
              </div>
              {liveClasses && liveClasses.length > 0 ? (
                <>
                  <h3 className="font-semibold text-sm mb-1 leading-snug">{liveClasses[0].title}</h3>
                  <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <LiveClassSchedule
                      scheduledAt={liveClasses[0].scheduled_at}
                      isRecurring={liveClasses[0].is_recurring ?? false}
                      recurrenceDayOfWeek={liveClasses[0].recurrence_day_of_week ?? null}
                      endTime={liveClasses[0].end_time ?? null}
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Live classes for {liveMonthLabel}</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-lg font-bold text-primary">
                Rs {liveSubscriptionPrice.toFixed(2)}<span className="text-sm font-normal text-muted-foreground">/mo</span>
              </span>
              {isLiveSubscribed ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <Badge className="gap-1 bg-primary/10 text-primary border-primary/20" variant="outline">
                    <Radio className="w-3 h-3" /> {afterCutoff ? 'Enrolled for ' + liveMonthLabel : 'Subscribed'}
                  </Badge>
                  {/* Allow subscribing for next month when not on recurring billing */}
                  {!hasRecurringLive && nextMonthLivePackage && !isNextMonthSubscribed && user && (
                    <BuySubscribeDialog
                      videoPackages={dialogPackageList}
                      subscribedPackageIds={subscribedVideoPackageIds}
                      gradeName={grade.name}
                      liveSubscriptionPrice={liveSubscriptionPrice}
                      liveSubscriptionEnabled={liveSubscriptionEnabled}
                      liveMonthPackageId={(nextMonthLivePackage as any).id}
                      liveMonthLabel={`${MONTHS[(nextMonthLivePackage as any).month - 1]} ${(nextMonthLivePackage as any).year}`}
                      pastLivePackages={(pastLivePackages ?? []) as any}
                      subscribedLivePackageIds={subscribedLivePackageIds}
                      defaultMode="live"
                      triggerLabel={`Subscribe for ${MONTHS[(nextMonthLivePackage as any).month - 1]}`}
                      triggerSize="sm"
                      isNextMonthMode={true}
                      isLoggedIn={!!user}
                    />
                  )}
                </div>
              ) : hasRecurringLive ? (
                <div className="flex flex-col items-end gap-1">
                  <Badge className="gap-1 bg-green-100 text-green-700 border-green-300 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800" variant="outline">
                    <RefreshCw className="w-3 h-3" /> Auto-renewal active
                  </Badge>
                  <span className="text-xs text-muted-foreground">Next month charged on day {billing.billingDay}</span>
                </div>
              ) : user ? (
                <BuySubscribeDialog
                  videoPackages={dialogPackageList}
                  subscribedPackageIds={subscribedVideoPackageIds}
                  gradeName={grade.name}
                  liveSubscriptionPrice={liveSubscriptionPrice}
                  liveSubscriptionEnabled={liveSubscriptionEnabled}
                  liveMonthPackageId={(currentLivePackage as any)?.id}
                  liveMonthLabel={liveMonthLabel}
                  pastLivePackages={(pastLivePackages ?? []) as any}
                  subscribedLivePackageIds={subscribedLivePackageIds}
                  defaultMode="live"
                  triggerLabel={afterCutoff ? `Subscribe for ${liveMonthLabel}` : 'Subscribe'}
                  isNextMonthMode={afterCutoff}
                  isLoggedIn={!!user}
                />
              ) : (
                <a
                  href={`/login?redirectTo=/grades/${grade.slug}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-accent text-sm font-medium transition-colors"
                >
                  <Radio className="w-4 h-4" />
                  Subscribe
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {(totalVideos > 0 || (chapters?.length ?? 0) > 0 || packages.length > 0) && (
        <section className="mb-12">
          {/* "Or" separator — only shown when live subscription banner is visible */}
          {liveSubscriptionEnabled && (
            <div className="flex items-center gap-4 mb-8">
              <div className="flex-1 border-t border-border/60" />
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-widest px-2">Or</span>
              <div className="flex-1 border-t border-border/60" />
            </div>
          )}

          {hasPackages && (
            <h2 className="text-lg sm:text-xl font-semibold mb-5 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" /> Video Packages
            </h2>
          )}
          {!hasPackages && (
            <h2 className="text-lg sm:text-xl font-semibold mb-5 flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" /> Video Lessons
            </h2>
          )}
          <GradePageContent
            packages={packages}
            chapters={chapters ?? []}
            videosByChapter={videosByChapter}
            documentsByChapter={documentsByChapter}
            unchapteredVideos={unchapteredVideos}
            gradeColor={grade.color}
            gradeSlug={grade.slug}
            subscribedVideoPackageIds={subscribedVideoPackageIds}
            subscribedLivePackageIds={subscribedLivePackageIds}
            isLoggedIn={!!user}
            gradeName={grade.name}
            liveSubscriptionEnabled={liveSubscriptionEnabled}
            liveSubscriptionPrice={liveSubscriptionPrice}
            liveMonthChapterIds={liveMonthChapterIds}
            liveMonthLabel={liveMonthLabel}
            liveMonthPackageId={(currentLivePackage as any)?.id}
            pastLivePackages={(pastLivePackages ?? []) as any}
          />
        </section>
      )}

      {totalVideos === 0 && (chapters?.length ?? 0) === 0 && packages.length === 0 && (
        <div className="py-24 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No content available for this grade yet. Check back soon!</p>
        </div>
      )}
    </div>
  )
}

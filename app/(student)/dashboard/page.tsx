import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { JoinLiveClassButton } from '@/components/lc/join-live-class-button'
import {
  ArrowRight, BookOpen, Radio, Bell, PlayCircle, GraduationCap, TrendingUp,
} from 'lucide-react'

export const metadata = { title: 'Dashboard' }

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default async function StudentDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profileRaw }, { data: subsRaw }, { data: watchedRaw }] = await Promise.all([
    (supabase as any)
      .from('profiles')
      .select('full_name, grade_id, parent_phone, grade:grades(id, name, slug, color, live_subscription_enabled)')
      .eq('id', user!.id)
      .single(),
    (supabase as any)
      .from('student_subscriptions')
      .select('package_id, is_recurring, subscription_type, package:subscription_packages(id, name, package_type, month, year, subscription_package_chapters(chapter_id))')
      .eq('student_id', user!.id)
      .eq('status', 'active'),
    (supabase as any)
      .from('video_progress')
      .select('video_id')
      .eq('student_id', user!.id),
  ])

  const profile = profileRaw as { full_name: string | null; grade_id: string | null; parent_phone: string | null; grade: { id: string; name: string; slug: string; color: string; live_subscription_enabled: boolean } | null } | null
  const grade = profile?.grade ?? null
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const hasParentPhone = !!profile?.parent_phone

  const subs = (subsRaw ?? []) as any[]
  const watchedSet = new Set((watchedRaw ?? []).map((w: any) => w.video_id))

  const hasLive = subs.some((s) => s.is_recurring && (s.subscription_type === 'live' || s.package?.package_type === 'live_month'))
  const hasAnyLivePkg = subs.some((s) => s.package?.package_type === 'live_month')
  const hasVideo = subs.some((s) => s.package && s.package.package_type !== 'live_month')
  const subscribedPackageIds = new Set(subs.map((s) => s.package_id).filter(Boolean))

  // ── Completion % per package (videos watched / total videos) ──
  const allChapterIds = Array.from(new Set(
    subs.flatMap((s) => (s.package?.subscription_package_chapters ?? []).map((c: any) => c.chapter_id)).filter(Boolean)
  ))
  const videosByChapter = new Map<string, string[]>()
  if (allChapterIds.length > 0) {
    const { data: vids } = await (supabase as any)
      .from('videos')
      .select('id, chapter_id')
      .in('chapter_id', allChapterIds)
      .eq('is_published', true)
    for (const v of (vids ?? []) as any[]) {
      const arr = videosByChapter.get(v.chapter_id)
      if (arr) arr.push(v.id)
      else videosByChapter.set(v.chapter_id, [v.id])
    }
  }

  const seenPkg = new Set<string>()
  const progress = subs
    .filter((s) => s.package && !seenPkg.has(s.package.id) && seenPkg.add(s.package.id))
    .map((s) => {
      const chIds: string[] = (s.package.subscription_package_chapters ?? []).map((c: any) => c.chapter_id)
      const videoIds = chIds.flatMap((ch) => videosByChapter.get(ch) ?? [])
      const total = videoIds.length
      const done = videoIds.filter((id) => watchedSet.has(id)).length
      const isLivePkg = s.package.package_type === 'live_month'
      const label = isLivePkg && s.package.month
        ? `${s.package.name} — ${MONTHS[s.package.month - 1]} ${s.package.year}`
        : s.package.name
      return { id: s.package.id, label, isLivePkg, total, done, pct: total ? Math.round((done / total) * 100) : 0 }
    })
    .sort((a, b) => a.pct - b.pct)

  // ── Unread messages ──
  const audienceFilter = ['all', ...(hasAnyLivePkg ? ['live'] : []), ...(hasVideo ? ['video'] : [])]
  let unreadCount = 0
  let latestUnread: string | null = null
  if (profile?.grade_id) {
    const [{ data: broadcasts }, { data: reads }] = await Promise.all([
      (supabase as any).from('broadcasts').select('id, title, created_at').eq('grade_id', profile.grade_id).in('target_audience', audienceFilter).order('created_at', { ascending: false }),
      (supabase as any).from('broadcast_reads').select('broadcast_id').eq('student_id', user!.id),
    ])
    const readSet = new Set((reads ?? []).map((r: any) => r.broadcast_id))
    const unread = ((broadcasts ?? []) as any[]).filter((b) => !readSet.has(b.id))
    unreadCount = unread.length
    latestUnread = unread[0]?.title ?? null
  }

  // ── Upcoming live class (for live subscribers) ──
  let liveJoin: any = null
  if (grade && grade.live_subscription_enabled && hasLive) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
    const [{ data: currentLiveClass }, { data: livePackages }] = await Promise.all([
      (supabase as any)
        .from('live_classes')
        .select('id, title, meet_url, scheduled_at, is_recurring, recurrence_day_of_week, end_time')
        .eq('grade_id', grade.id)
        .eq('is_published', true)
        .gte('scheduled_at', monthStart)
        .lt('scheduled_at', monthEnd)
        .order('scheduled_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
      (supabase as any)
        .from('subscription_packages')
        .select('id, month, year')
        .eq('grade_id', grade.id)
        .eq('package_type', 'live_month')
        .eq('is_active', true),
    ])
    const cm = now.getMonth() + 1, cy = now.getFullYear()
    const currentMonthPkg = ((livePackages ?? []) as any[]).find((p) => p.month === cm && p.year === cy)
    const subscribedCurrentMonth = currentMonthPkg ? subscribedPackageIds.has(currentMonthPkg.id) : false
    if (subscribedCurrentMonth && currentLiveClass?.meet_url) {
      liveJoin = { cls: currentLiveClass, gradeId: grade.id }
    }
  }

  const noSubs = subs.length === 0

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {firstName}!</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {grade ? <>You&rsquo;re enrolled in <span className="font-medium text-foreground">{grade.name}</span></> : 'Set your grade to get started.'}
          </p>
        </div>
        {!grade && (
          <Button size="sm" variant="outline" asChild><Link href="/dashboard/account">Set your grade →</Link></Button>
        )}
      </div>

      {/* Unread messages notification */}
      {unreadCount > 0 && (
        <Link
          href="/dashboard/notices"
          className="flex items-center gap-3 p-4 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
        >
          <span className="relative w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-primary" />
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{unreadCount}</span>
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{unreadCount} new message{unreadCount !== 1 ? 's' : ''} from your teacher</p>
            {latestUnread && <p className="text-xs text-muted-foreground truncate">{latestUnread}</p>}
          </div>
          <ArrowRight className="w-4 h-4 text-primary shrink-0" />
        </Link>
      )}

      {/* Access widgets: live join + video access */}
      {(liveJoin || hasVideo) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {liveJoin && (
            <div className="p-5 rounded-xl border border-primary/30 bg-card flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <Radio className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">Your live class</span>
              </div>
              <h3 className="font-semibold text-sm mb-3">{liveJoin.cls.title}</h3>
              <div className="mt-auto">
                <JoinLiveClassButton
                  liveClassId={liveJoin.cls.id}
                  meetUrl={liveJoin.cls.meet_url}
                  gradeId={liveJoin.gradeId}
                  scheduledAt={liveJoin.cls.scheduled_at}
                  endTime={liveJoin.cls.end_time ?? null}
                  isRecurring={liveJoin.cls.is_recurring ?? false}
                  recurrenceDayOfWeek={liveJoin.cls.recurrence_day_of_week ?? null}
                  hasParentPhone={hasParentPhone}
                />
              </div>
            </div>
          )}
          {hasVideo && (
            <Link href="/dashboard/my-videos" className="p-5 rounded-xl border border-border/60 bg-card hover:border-primary/30 transition-colors flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <PlayCircle className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your videos</span>
              </div>
              <h3 className="font-semibold text-sm mb-1">Watch your video lessons</h3>
              <p className="text-xs text-muted-foreground mb-3">Access every video in the packages you own.</p>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">Open my videos <ArrowRight className="w-4 h-4" /></span>
            </Link>
          )}
        </div>
      )}

      {/* Completion progress */}
      {progress.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Your progress</h2>
          </div>
          <div className="space-y-3">
            {progress.map((p) => (
              <div key={p.id} className="p-4 rounded-xl border border-border/60 bg-card">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {p.isLivePkg ? <Radio className="w-3.5 h-3.5 text-primary shrink-0" /> : <BookOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                    <span className="font-medium text-sm truncate">{p.label}</span>
                  </div>
                  <span className="text-sm font-semibold shrink-0">{p.pct}%</span>
                </div>
                <Progress value={p.pct} />
                <p className="text-xs text-muted-foreground mt-1.5">
                  {p.total === 0 ? 'No videos in this package yet' : `${p.done} of ${p.total} video${p.total !== 1 ? 's' : ''} watched`}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state — no subscriptions */}
      {noSubs && (
        <div className="py-16 text-center rounded-xl border border-border/60">
          <GraduationCap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Start learning</h3>
          <p className="text-sm text-muted-foreground mb-6">Subscribe to live classes or buy video packages for your grade.</p>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-accent">
            <Link href={grade ? `/grades/${grade.slug}` : '/grades'}>Browse {grade ? grade.name : 'grades'} <ArrowRight className="ml-2 w-4 h-4" /></Link>
          </Button>
        </div>
      )}
    </div>
  )
}

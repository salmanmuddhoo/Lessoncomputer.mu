import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StreamablePlayer } from '@/components/lc/streamable-player'
import { VideoDescription } from '@/components/lc/video-description'
import { VideoPlaylist, type PlaylistPackage } from '@/components/lc/video-playlist'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, ArrowLeft, Lock, BookOpen, Package } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ live?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('videos')
    .select('title, description, grade:grades(name)')
    .eq('id', id)
    .single()

  if (!data) return { title: 'Video Lesson | LessonComputer.mu' }

  const grade = data.grade as { name: string } | null
  const title = `${data.title}${grade ? ` — ${grade.name}` : ''} | LessonComputer.mu`
  const description =
    data.description ??
    `Watch "${data.title}" on LessonComputer.mu — quality video lessons for Mauritian students.`

  return {
    title,
    description,
    openGraph: { title, description, type: 'video.other', siteName: 'LessonComputer.mu' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function VideoPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { live } = await searchParams
  const isLiveContext = live === '1'
  const supabase = await createClient()

  let video: any = null
  if (isLiveContext) {
    const { data } = await supabase
      .from('videos')
      .select('*, grade:grades(*), chapter:chapters(*)')
      .eq('id', id)
      .or('is_published.eq.true,is_published_for_live.eq.true' as any)
      .single()
    video = data
  } else {
    const { data } = await supabase
      .from('videos')
      .select('*, grade:grades(*), chapter:chapters(*)')
      .eq('id', id)
      .eq('is_published', true)
      .single()
    video = data
  }

  if (!video) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  // A deactivated (suspended) student loses access to paid content, even via a direct
  // link — treat them like a non-subscriber (free/demo content still shows).
  let isActiveStudent = true
  if (user) {
    const { data: prof } = await supabase.from('profiles').select('is_active').eq('id', user.id).single()
    isActiveStudent = (prof as any)?.is_active !== false
  }

  let hasAccess = video.is_free || video.is_demo
  let pkgIds: string[] = []

  if (user && isActiveStudent && video.chapter_id) {
    const { data: subs } = await supabase
      .from('student_subscriptions')
      .select('package_id, valid_from, valid_until')
      .eq('student_id', user.id)
      .eq('status', 'active')
      .not('package_id', 'is', null)

    // Currently-valid subscriptions, checked in Mauritius time. Video packages have
    // null dates (never expire); live subscriptions are valid within their paid month.
    // A subscription to EITHER a video package or a live package that includes this
    // chapter grants access — so a live subscriber can watch the videos in that package.
    const muToday = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().split('T')[0] // Mauritius (UTC+4)
    pkgIds = ((subs ?? []) as any[])
      .filter((s) =>
        (!s.valid_from || s.valid_from <= muToday) &&
        (!s.valid_until || s.valid_until >= muToday)
      )
      .map((s) => s.package_id)
      .filter(Boolean)

    if (!hasAccess && pkgIds.length > 0) {
      const { data: link } = await supabase
        .from('subscription_package_chapters')
        .select('package_id')
        .eq('chapter_id', video.chapter_id)
        .in('package_id', pkgIds)
        .limit(1)
        .maybeSingle()

      hasAccess = !!link
    }
  }

  // Record that the student watched this video (open = watched) for the
  // dashboard completion %. Idempotent per (student, video).
  if (user && hasAccess) {
    await (supabase as any)
      .from('video_progress')
      .upsert({ student_id: user.id, video_id: video.id, watched_at: new Date().toISOString() }, { onConflict: 'student_id,video_id' })
  }

  // Build playlist for authenticated users with subscriptions
  let playlistData: PlaylistPackage[] = []
  if (user && pkgIds.length > 0) {
    const publishedField = isLiveContext ? 'is_published_for_live' : 'is_published'
    const pkgType = isLiveContext ? 'live_month' : 'video'

    const { data: packages } = await supabase
      .from('subscription_packages')
      .select('id, name, package_type, month, year')
      .in('id', pkgIds)
      .eq('package_type', pkgType)
      .order('year', { ascending: true })
      .order('month', { ascending: true, nullsFirst: false })

    if (packages && packages.length > 0) {
      const relevantPkgIds = packages.map((p: any) => p.id)

      const { data: pkgChaptersData } = await supabase
        .from('subscription_package_chapters')
        .select('package_id, chapter:chapters(id, title, order_index)')
        .in('package_id', relevantPkgIds)

      const pkgChapters = pkgChaptersData ?? []
      const chapterIds = pkgChapters
        .map((pc: any) => (pc.chapter as any)?.id)
        .filter(Boolean)

      let allVideos: any[] = []
      let allDocs: any[] = []
      let allNotes: any[] = []
      if (chapterIds.length > 0) {
        const [{ data: vids }, { data: docs }, { data: notes }] = await Promise.all([
          supabase
            .from('videos')
            .select('id, title, duration_minutes, chapter_id')
            .in('chapter_id', chapterIds)
            .eq(publishedField as any, true)
            .order('created_at', { ascending: true }),
          (supabase as any)
            .from('documents')
            .select('id, title, file_url, file_url_live, chapter_id')
            .in('chapter_id', chapterIds)
            .eq(isLiveContext ? 'is_published_for_live' : 'is_published', true),
          (supabase as any)
            .from('revision_notes')
            .select('id, title, chapter_id')
            .in('chapter_id', chapterIds)
            .eq(isLiveContext ? 'is_published_for_live' : 'is_published', true),
        ])
        allVideos = vids ?? []
        allDocs = docs ?? []
        allNotes = notes ?? []
      }

      playlistData = packages
        .map((pkg: any) => {
          const chapterLinks = pkgChapters
            .filter((pc: any) => pc.package_id === pkg.id)
            .map((pc: any) => pc.chapter as any)
            .filter(Boolean)

          const chapters = chapterLinks
            .map((ch: any) => {
              const videos = allVideos
                .filter(v => v.chapter_id === ch.id)
                .map(v => ({ id: v.id, title: v.title, duration_minutes: v.duration_minutes }))

              const documents = [
                ...allDocs
                  .filter(d => d.chapter_id === ch.id)
                  .map(d => ({
                    id: d.id,
                    title: d.title,
                    type: 'document' as const,
                    url: (isLiveContext && d.file_url_live) ? d.file_url_live : d.file_url,
                  })),
                ...allNotes
                  .filter(n => n.chapter_id === ch.id)
                  .map(n => ({
                    id: n.id,
                    title: n.title,
                    type: 'revision_note' as const,
                    url: `/api/notes/${n.id}${isLiveContext ? '?live=1' : ''}`,
                  })),
              ]

              return {
                id: ch.id,
                title: ch.title,
                order_index: ch.order_index ?? 0,
                videos,
                documents,
              }
            })
            .filter((ch: any) => ch.videos.length > 0 || ch.documents.length > 0)
            .sort((a: any, b: any) => a.order_index - b.order_index)

          return {
            id: pkg.id,
            name: pkg.name,
            package_type: pkg.package_type,
            month: pkg.month ?? null,
            year: pkg.year ?? null,
            chapters,
          }
        })
        .filter((pkg: any) => pkg.chapters.length > 0)
    }
  }

  const grade = video.grade as { name: string; color: string; slug: string } | null
  const chapter = video.chapter as { title: string } | null
  const playerUrl = (isLiveContext && video.streamable_url_live) ? video.streamable_url_live : video.streamable_url

  return (
    <div className="min-h-screen bg-background">
      {/* Back nav */}
      <div className="px-4 sm:px-6 lg:px-8 pt-4 pb-2 max-w-screen-2xl mx-auto">
        <Link
          href={user ? '/dashboard' : (grade ? `/grades/${grade.slug}` : '/')}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {user ? 'Back to Dashboard' : (grade ? `Back to ${grade.name}` : 'Back')}
        </Link>
      </div>

      {/* Main YouTube-style layout */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── Left: player + info ── */}
          <div className="flex-1 min-w-0">

            {/* Player */}
            {hasAccess ? (
              <div className="w-full rounded-xl overflow-hidden bg-black shadow-lg">
                <StreamablePlayer url={playerUrl} title={video.title} />
              </div>
            ) : (
              <div className="aspect-video rounded-xl bg-zinc-900 border border-border/40 flex flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Subscription required</h3>
                  <p className="text-sm text-zinc-400 mb-4">
                    {chapter
                      ? `Subscribe to a package that includes "${chapter.title}" to watch this video.`
                      : 'Subscribe to a package for this grade to watch this video.'}
                  </p>
                  {user ? (
                    grade && (
                      <Button asChild className="bg-primary text-primary-foreground hover:bg-accent">
                        <Link href={`/grades/${grade.slug}`}>
                          <Package className="w-4 h-4 mr-2" />
                          View Subscription Packages
                        </Link>
                      </Button>
                    )
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button variant="outline" asChild className="border-zinc-600 text-white hover:bg-zinc-800">
                        <Link href={`/login?redirectTo=/videos/${video.id}`}>Log in</Link>
                      </Button>
                      <Button asChild className="bg-primary text-primary-foreground hover:bg-accent">
                        <Link href="/register">Create Account</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Title */}
            <div className="mt-4">
              <h1 className="text-lg sm:text-xl font-bold leading-snug">{video.title}</h1>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {grade && (
                  <Badge
                    variant="outline"
                    style={{ borderColor: `${grade.color}40`, color: grade.color, backgroundColor: `${grade.color}10` }}
                  >
                    {grade.name}
                  </Badge>
                )}
                {chapter && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <BookOpen className="w-3 h-3" />
                    {chapter.title}
                  </Badge>
                )}
                {video.duration_minutes && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    {video.duration_minutes} min
                  </span>
                )}
                {video.is_free && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs" variant="outline">Free</Badge>
                )}
              </div>
            </div>

            {/* Description box */}
            {video.description && (
              <div className="mt-4 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                <VideoDescription description={video.description} />
              </div>
            )}

            {/* Mobile: playlist below description */}
            {playlistData.length > 0 && (
              <div className="lg:hidden">
                <VideoPlaylist
                  playlist={playlistData}
                  currentVideoId={id}
                  isLiveContext={isLiveContext}
                  gradeColor={grade?.color}
                />
              </div>
            )}
          </div>

          {/* ── Right: playlist sidebar (desktop only) ── */}
          {playlistData.length > 0 && (
            <div className="hidden lg:block">
              <VideoPlaylist
                playlist={playlistData}
                currentVideoId={id}
                isLiveContext={isLiveContext}
                gradeColor={grade?.color}
              />
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StreamablePlayer } from '@/components/lc/streamable-player'
import { VideoDescription } from '@/components/lc/video-description'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, ArrowLeft, Lock, BookOpen, Package, Play } from 'lucide-react'

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

  let hasAccess = video.is_free || video.is_demo

  if (!hasAccess && user && video.chapter_id) {
    const { data: subs } = await supabase
      .from('student_subscriptions')
      .select('package_id')
      .eq('student_id', user.id)
      .eq('status', 'active')
      .not('package_id', 'is', null)

    const pkgIds = (subs ?? []).map((s: any) => s.package_id).filter(Boolean)

    if (pkgIds.length > 0) {
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

  // Fetch related videos from same chapter
  const relatedVideos: any[] = []
  if (video.chapter_id) {
    const publishedField = isLiveContext ? 'is_published_for_live' : 'is_published'
    const { data: related } = await supabase
      .from('videos')
      .select('id, title, duration_minutes, streamable_url')
      .eq('chapter_id', video.chapter_id)
      .eq(publishedField as any, true)
      .neq('id', id)
      .order('created_at', { ascending: true })
      .limit(20)
    if (related) relatedVideos.push(...related)
  }

  const grade = video.grade as { name: string; color: string; slug: string } | null
  const chapter = video.chapter as { title: string } | null
  const playerUrl = (isLiveContext && video.streamable_url_live) ? video.streamable_url_live : video.streamable_url

  return (
    <div className="min-h-screen bg-background">
      {/* Back nav */}
      <div className="px-4 sm:px-6 lg:px-8 pt-4 pb-2 max-w-screen-2xl mx-auto">
        <Link
          href={grade ? `/grades/${grade.slug}` : '/'}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {grade ? `Back to ${grade.name}` : 'Back'}
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

            {/* Mobile: related videos below description */}
            {relatedVideos.length > 0 && (
              <div className="lg:hidden mt-6">
                <h2 className="text-sm font-semibold mb-3 uppercase tracking-wide text-muted-foreground">
                  Up next
                </h2>
                <div className="space-y-2">
                  {relatedVideos.map((v) => (
                    <RelatedVideoCard
                      key={v.id}
                      video={v}
                      gradeColor={grade?.color}
                      isLiveContext={isLiveContext}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: related videos sidebar (desktop only) ── */}
          {relatedVideos.length > 0 && (
            <div className="hidden lg:block w-[360px] shrink-0">
              <h2 className="text-sm font-semibold mb-3 uppercase tracking-wide text-muted-foreground">
                Up next
              </h2>
              <div className="space-y-2">
                {relatedVideos.map((v) => (
                  <RelatedVideoCard
                    key={v.id}
                    video={v}
                    gradeColor={grade?.color}
                    isLiveContext={isLiveContext}
                  />
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function RelatedVideoCard({
  video,
  gradeColor,
  isLiveContext,
}: {
  video: { id: string; title: string; duration_minutes: number | null }
  gradeColor?: string
  isLiveContext: boolean
}) {
  const href = `/videos/${video.id}${isLiveContext ? '?live=1' : ''}`
  return (
    <Link
      href={href}
      className="flex gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors group"
    >
      {/* Thumbnail placeholder */}
      <div
        className="w-40 aspect-video rounded-lg shrink-0 flex items-center justify-center relative overflow-hidden"
        style={{ backgroundColor: gradeColor ? `${gradeColor}20` : undefined }}
      >
        <div className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center group-hover:bg-primary/80 transition-colors">
          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 py-0.5">
        <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {video.title}
        </p>
        {video.duration_minutes && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {video.duration_minutes} min
          </p>
        )}
      </div>
    </Link>
  )
}

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { VideoCard } from '@/components/lc/video-card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Video, Users, FolderOpen } from 'lucide-react'
import type { Chapter } from '@/lib/types/database'

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
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'LessonComputer.mu',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default async function GradePage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: grade } = await supabase
    .from('grades')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!grade) notFound()

  const [{ data: videos }, { data: liveClasses }, { data: chapters }] = await Promise.all([
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
      .order('scheduled_at', { ascending: true }),
    supabase
      .from('chapters')
      .select('*')
      .eq('grade_id', grade.id)
      .order('order_index'),
  ])

  // Group videos by chapter
  const chapterMap = new Map<string, typeof videos>()
  const unchapteredVideos: typeof videos = []

  if (videos) {
    for (const v of videos) {
      if (v.chapter_id) {
        const list = chapterMap.get(v.chapter_id) ?? []
        list.push(v)
        chapterMap.set(v.chapter_id, list)
      } else {
        unchapteredVideos.push(v)
      }
    }
  }

  const hasChapters = (chapters?.length ?? 0) > 0
  const totalVideos = videos?.length ?? 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Grade header */}
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
          {hasChapters && (
            <Badge variant="secondary" className="gap-1">
              <BookOpen className="w-3 h-3" />
              {chapters!.length} {chapters!.length === 1 ? 'chapter' : 'chapters'}
            </Badge>
          )}
          <Badge variant="secondary" className="gap-1">
            <Users className="w-3 h-3" />
            {liveClasses?.length ?? 0} live {(liveClasses?.length ?? 0) === 1 ? 'class' : 'classes'}
          </Badge>
        </div>
      </header>

      {/* Videos section */}
      {totalVideos > 0 && (
        <section className="mb-12">
          <h2 className="text-lg sm:text-xl font-semibold mb-5 flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            Video Lessons
          </h2>

          {hasChapters ? (
            /* ── Grouped by chapter ── */
            <div className="space-y-10">
              {chapters!.map((ch: Chapter) => {
                const chVideos = chapterMap.get(ch.id)
                if (!chVideos?.length) return null
                return (
                  <div key={ch.id}>
                    <div className="flex items-center gap-2 mb-4">
                      <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                      <h3 className="font-semibold text-base">{ch.title}</h3>
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">
                        {chVideos.length} {chVideos.length === 1 ? 'video' : 'videos'}
                      </span>
                    </div>
                    {ch.description && (
                      <p className="text-sm text-muted-foreground mb-3 -mt-2">{ch.description}</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {chVideos.map((v) => (
                        <VideoCard key={v.id} video={v} />
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* Videos without a chapter */}
              {unchapteredVideos.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Video className="w-4 h-4 text-muted-foreground shrink-0" />
                    <h3 className="font-semibold text-base text-muted-foreground">Other Videos</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {unchapteredVideos.map((v) => (
                      <VideoCard key={v.id} video={v} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── Flat list (no chapters) ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {videos!.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Live Classes section */}
      {liveClasses && liveClasses.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg sm:text-xl font-semibold mb-5 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Upcoming Live Classes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {liveClasses.map((lc) => (
              <div
                key={lc.id}
                className="p-5 rounded-xl border border-border/60 bg-card hover:border-primary/30 transition-colors"
              >
                <Badge className="mb-3 bg-primary/10 text-primary border-primary/20" variant="outline">
                  Live Class
                </Badge>
                <h3 className="font-medium mb-1">{lc.title}</h3>
                {lc.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{lc.description}</p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {new Date(lc.scheduled_at).toLocaleDateString('en-MU', { dateStyle: 'medium' })}
                    {' '}
                    {new Date(lc.scheduled_at).toLocaleTimeString('en-MU', { timeStyle: 'short' })}
                  </span>
                  <span className="font-semibold">
                    {lc.price === 0 ? (
                      <span className="text-primary">Free</span>
                    ) : (
                      `Rs ${lc.price}`
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {totalVideos === 0 && !liveClasses?.length && (
        <div className="py-24 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No content available for this grade yet. Check back soon!</p>
        </div>
      )}
    </div>
  )
}

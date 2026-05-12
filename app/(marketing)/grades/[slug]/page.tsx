import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { VideoCard } from '@/components/lc/video-card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Video, Users } from 'lucide-react'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  return {
    title: `Browse ${slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} content`,
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

  const [{ data: videos }, { data: liveClasses }] = await Promise.all([
    supabase
      .from('videos')
      .select('*, grade:grades(*)')
      .eq('grade_id', grade.id)
      .eq('is_published', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('live_classes')
      .select('*, grade:grades(*)')
      .eq('grade_id', grade.id)
      .eq('is_published', true)
      .order('scheduled_at', { ascending: true }),
  ])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg"
            style={{ backgroundColor: `${grade.color}20`, color: grade.color }}
          >
            {grade.name.replace('Grade ', '')}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{grade.name}</h1>
            {grade.description && (
              <p className="text-sm text-muted-foreground">{grade.description}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Badge variant="secondary" className="gap-1">
            <Video className="w-3 h-3" />
            {videos?.length ?? 0} videos
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Users className="w-3 h-3" />
            {liveClasses?.length ?? 0} live classes
          </Badge>
        </div>
      </div>

      {/* Videos */}
      {videos && videos.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-5 flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            Video Lessons
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {videos.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        </section>
      )}

      {/* Live Classes */}
      {liveClasses && liveClasses.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-5 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Upcoming Live Classes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {liveClasses.map((lc) => (
              <div key={lc.id} className="p-5 rounded-xl border border-border/60 bg-card hover:border-primary/30 transition-colors">
                <Badge className="mb-3 bg-primary/10 text-primary border-primary/20" variant="outline">Live Class</Badge>
                <h3 className="font-medium mb-1">{lc.title}</h3>
                {lc.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{lc.description}</p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {new Date(lc.scheduled_at).toLocaleDateString('en-MU', {
                      dateStyle: 'medium',
                    })}
                    {' '}
                    {new Date(lc.scheduled_at).toLocaleTimeString('en-MU', {
                      timeStyle: 'short',
                    })}
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

      {(!videos?.length && !liveClasses?.length) && (
        <div className="py-24 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No content available for this grade yet. Check back soon!</p>
        </div>
      )}
    </div>
  )
}

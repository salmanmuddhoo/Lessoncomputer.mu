import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StreamablePlayer } from '@/components/lc/streamable-player'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, ArrowLeft, Lock, ShoppingCart, BookOpen } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
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
    openGraph: {
      title,
      description,
      type: 'video.other',
      siteName: 'LessonComputer.mu',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function VideoPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: video } = await supabase
    .from('videos')
    .select('*, grade:grades(*), chapter:chapters(*)')
    .eq('id', id)
    .eq('is_published', true)
    .single()

  if (!video) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  let hasAccess = video.is_free

  if (!hasAccess && user) {
    const { data: purchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('student_id', user.id)
      .eq('video_id', video.id)
      .eq('status', 'completed')
      .maybeSingle()
    hasAccess = !!purchase
  }

  const grade = video.grade as { name: string; color: string; slug: string } | null
  const chapter = video.chapter as { title: string } | null

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Breadcrumb / back */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-5 flex-wrap">
        {grade ? (
          <>
            <Link href={`/grades/${grade.slug}`} className="hover:text-primary transition-colors">
              {grade.name}
            </Link>
            {chapter && (
              <>
                <span>/</span>
                <span>{chapter.title}</span>
              </>
            )}
            <span>/</span>
            <span className="text-foreground truncate max-w-[200px]">{video.title}</span>
          </>
        ) : (
          <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Home
          </Link>
        )}
      </nav>

      {/* Player or paywall */}
      {hasAccess ? (
        <StreamablePlayer url={video.streamable_url} title={video.title} />
      ) : (
        <div className="aspect-video rounded-xl bg-secondary/50 border border-border/60 flex flex-col items-center justify-center gap-4 px-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold mb-1">This video requires purchase</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Purchase this video for Rs {video.price} to watch it.
            </p>
            {user ? (
              <Button className="bg-primary text-primary-foreground hover:bg-accent">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Buy for Rs {video.price}
              </Button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" asChild>
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

      {/* Info */}
      <div className="mt-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="text-lg sm:text-xl font-bold flex-1 leading-snug">{video.title}</h1>
          {video.is_free ? (
            <Badge className="bg-primary/10 text-primary border-primary/20 shrink-0" variant="outline">Free</Badge>
          ) : (
            <span className="font-semibold shrink-0 text-sm">Rs {video.price}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-4">
          {grade && (
            <Badge variant="outline" style={{ borderColor: `${grade.color}40`, color: grade.color }}>
              {grade.name}
            </Badge>
          )}
          {chapter && (
            <Badge variant="secondary" className="gap-1">
              <BookOpen className="w-3 h-3" />
              {chapter.title}
            </Badge>
          )}
          {video.duration_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {video.duration_minutes} min
            </span>
          )}
        </div>

        {video.description && (
          <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">{video.description}</p>
        )}

        {grade && (
          <div className="mt-6 pt-6 border-t border-border/40">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/grades/${grade.slug}`}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                More {grade.name} lessons
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

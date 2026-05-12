import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StreamablePlayer } from '@/components/lc/streamable-player'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, ArrowLeft, Lock, ShoppingCart } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('videos').select('title, description').eq('id', id).single()
  return {
    title: data?.title ?? 'Video Lesson',
    description: data?.description ?? undefined,
  }
}

export default async function VideoPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: video } = await supabase
    .from('videos')
    .select('*, grade:grades(*)')
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back */}
      {grade && (
        <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
          <Link href={`/grades/${grade.slug}`}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to {grade.name}
          </Link>
        </Button>
      )}

      {/* Player or paywall */}
      {hasAccess ? (
        <StreamablePlayer url={video.streamable_url} title={video.title} />
      ) : (
        <div className="aspect-video rounded-xl bg-secondary/50 border border-border/60 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
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
              <div className="flex gap-3 justify-center">
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
          <h1 className="text-xl font-bold flex-1">{video.title}</h1>
          {video.is_free ? (
            <Badge className="bg-primary/10 text-primary border-primary/20 shrink-0" variant="outline">Free</Badge>
          ) : (
            <span className="font-semibold shrink-0">Rs {video.price}</span>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
          {grade && (
            <Badge variant="outline" style={{ borderColor: `${grade.color}40`, color: grade.color }}>
              {grade.name}
            </Badge>
          )}
          {video.duration_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {video.duration_minutes} minutes
            </span>
          )}
        </div>

        {video.description && (
          <p className="text-muted-foreground leading-relaxed">{video.description}</p>
        )}
      </div>
    </div>
  )
}

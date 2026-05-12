import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { VideoCard } from '@/components/lc/video-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, BookOpen, ShoppingBag, Users, Calendar } from 'lucide-react'

export const metadata = { title: 'Dashboard' }

export default async function StudentDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: profile },
    { data: purchases },
    { data: upcomingClasses },
    { data: freeVideos },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user!.id).single(),
    supabase
      .from('purchases')
      .select('*, video:videos(*, grade:grades(*))')
      .eq('student_id', user!.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(4),
    supabase
      .from('live_classes')
      .select('*, grade:grades(*)')
      .eq('is_published', true)
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at')
      .limit(3),
    supabase
      .from('videos')
      .select('*, grade:grades(*)')
      .eq('is_published', true)
      .eq('is_free', true)
      .order('created_at', { ascending: false })
      .limit(4),
  ])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Welcome back, {firstName}!</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Continue where you left off.</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{purchases?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Videos owned</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{freeVideos?.length ?? 0}+</p>
              <p className="text-xs text-muted-foreground">Free videos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 col-span-2 md:col-span-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{upcomingClasses?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Upcoming classes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Purchased Videos */}
      {purchases && purchases.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">My Videos</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/my-videos">View all <ArrowRight className="ml-1 w-3 h-3" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {purchases.map((p) => p.video && (
              <VideoCard key={p.id} video={p.video} owned />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Live Classes */}
      {upcomingClasses && upcomingClasses.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Upcoming Live Classes</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/live-classes">View all <ArrowRight className="ml-1 w-3 h-3" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingClasses.map((lc) => (
              <div key={lc.id} className="p-5 rounded-xl border border-border/60 bg-card hover:border-primary/30 transition-colors">
                <Badge className="mb-3 bg-primary/10 text-primary border-primary/20" variant="outline">
                  {(lc.grade as { name: string })?.name}
                </Badge>
                <h3 className="font-medium mb-2">{lc.title}</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {new Date(lc.scheduled_at).toLocaleDateString('en-MU', { dateStyle: 'medium' })}
                  {' · '}
                  {new Date(lc.scheduled_at).toLocaleTimeString('en-MU', { timeStyle: 'short' })}
                </div>
                {lc.meet_url && (
                  <a
                    href={lc.meet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-xs text-primary hover:underline font-medium"
                  >
                    Join session →
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Free Videos to Explore */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Free Lessons to Explore</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/grades">Browse all <ArrowRight className="ml-1 w-3 h-3" /></Link>
          </Button>
        </div>
        {freeVideos && freeVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {freeVideos.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No free videos available yet.</p>
        )}
      </section>
    </div>
  )
}

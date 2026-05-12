import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Calendar, Video, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const metadata = { title: 'Live Classes' }

export default async function StudentLiveClassesPage() {
  const supabase = await createClient()

  const { data: classes } = await supabase
    .from('live_classes')
    .select('*, grade:grades(*)')
    .eq('is_published', true)
    .order('scheduled_at', { ascending: false })

  const now = new Date()
  const upcoming = classes?.filter((c) => new Date(c.scheduled_at) >= now) ?? []
  const past = classes?.filter((c) => new Date(c.scheduled_at) < now) ?? []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Live Classes</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Join scheduled sessions with expert teachers.</p>
      </div>

      {upcoming.length > 0 && (
        <section className="mb-10">
          <h2 className="font-semibold mb-4">Upcoming</h2>
          <div className="space-y-3">
            {upcoming.map((c) => {
              const grade = c.grade as { name: string; color: string } | null
              return (
                <div key={c.id} className="flex items-start gap-4 p-5 rounded-xl border border-border/60 bg-card hover:border-primary/30 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                    <span className="text-xs text-primary font-bold">
                      {new Date(c.scheduled_at).toLocaleDateString('en-MU', { day: '2-digit' })}
                    </span>
                    <span className="text-xs text-primary uppercase">
                      {new Date(c.scheduled_at).toLocaleDateString('en-MU', { month: 'short' })}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {grade && (
                        <Badge variant="outline" style={{ borderColor: `${grade.color}40`, color: grade.color }} className="text-xs">
                          {grade.name}
                        </Badge>
                      )}
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-xs" variant="outline">
                        Upcoming
                      </Badge>
                    </div>
                    <h3 className="font-medium truncate">{c.title}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(c.scheduled_at).toLocaleString('en-MU', { dateStyle: 'full', timeStyle: 'short' })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="font-semibold text-sm">
                      {c.price === 0 ? <span className="text-primary">Free</span> : `Rs ${c.price}`}
                    </span>
                    {c.meet_url && (
                      <Button size="sm" asChild className="bg-primary text-primary-foreground hover:bg-accent text-xs h-7">
                        <a href={c.meet_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3 mr-1" /> Join
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="font-semibold mb-4 text-muted-foreground">Past Classes & Replays</h2>
          <div className="space-y-3">
            {past.map((c) => {
              const grade = c.grade as { name: string; color: string } | null
              return (
                <div key={c.id} className="flex items-center gap-4 p-4 rounded-xl border border-border/40 bg-card/50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {grade && <span className="text-xs text-muted-foreground">{grade.name}</span>}
                    </div>
                    <h3 className="font-medium text-sm truncate">{c.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.scheduled_at).toLocaleDateString('en-MU', { dateStyle: 'medium' })}
                    </p>
                  </div>
                  {c.streamable_replay_url && (
                    <Button size="sm" variant="outline" asChild className="text-xs h-7">
                      <Link href={`/videos/replay-${c.id}`}>
                        <Video className="w-3 h-3 mr-1" /> Watch Replay
                      </Link>
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {!upcoming.length && !past.length && (
        <div className="py-16 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No live classes scheduled yet. Check back soon!</p>
        </div>
      )}
    </div>
  )
}

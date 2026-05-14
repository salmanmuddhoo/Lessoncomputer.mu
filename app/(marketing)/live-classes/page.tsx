import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LiveClassSchedule } from '@/components/lc/live-class-schedule'
import Link from 'next/link'
import { Users, Clock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Live Classes | LessonComputer.mu',
  description: 'Join live online classes with expert teachers for Grades 7–12. Interactive sessions tailored to the Mauritian curriculum.',
  openGraph: {
    title: 'Live Classes | LessonComputer.mu',
    description: 'Join live online classes for Grades 7–12.',
    siteName: 'LessonComputer.mu',
  },
}

export default async function LiveClassesPage() {
  const supabase = await createClient()

  const { data: liveClasses } = await supabase
    .from('live_classes')
    .select('*, grade:grades(name, color, slug)')
    .eq('is_published', true)
    .order('scheduled_at', { ascending: true })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-10 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Live Classes</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Interactive live sessions with expert teachers. Ask questions in real time and learn with peers.
        </p>
      </div>

      {liveClasses && liveClasses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {liveClasses.map((lc) => {
            const grade = lc.grade as { name: string; color: string; slug: string } | null
            const isPast = new Date(lc.scheduled_at) < new Date()

            return (
              <div key={lc.id} className="p-5 rounded-xl border border-border/60 bg-card hover:border-primary/30 transition-colors flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge
                    className="shrink-0"
                    style={grade ? { backgroundColor: `${grade.color}20`, color: grade.color, borderColor: `${grade.color}40` } : {}}
                    variant="outline"
                  >
                    {grade?.name ?? 'General'}
                  </Badge>
                  {isPast ? (
                    <Badge variant="secondary" className="text-xs shrink-0">Replay available</Badge>
                  ) : (
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-xs shrink-0" variant="outline">Upcoming</Badge>
                  )}
                </div>

                <h3 className="font-semibold leading-snug">{lc.title}</h3>

                {lc.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{lc.description}</p>
                )}

                <div className="flex items-start gap-1.5 text-xs text-muted-foreground mt-auto pt-1">
                  <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <LiveClassSchedule
                    scheduledAt={lc.scheduled_at}
                    isRecurring={(lc as any).is_recurring ?? false}
                    recurrenceDayOfWeek={(lc as any).recurrence_day_of_week ?? null}
                    endTime={(lc as any).end_time ?? null}
                  />
                </div>

                {grade && (
                  <div className="pt-2 border-t border-border/40">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/grades/${grade.slug}`}>View Grade</Link>
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="py-24 text-center">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">No live classes scheduled yet.</p>
          <p className="text-sm text-muted-foreground">Check back soon — new sessions are added regularly.</p>
        </div>
      )}
    </div>
  )
}

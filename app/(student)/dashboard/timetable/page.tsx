import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Calendar } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Timetable' }

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

export default async function TimetablePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('grade_id, grade:grades(id, name, color)')
    .eq('id', user.id)
    .single()

  const grade = profile?.grade as { id: string; name: string; color: string } | null

  if (!grade) {
    return (
      <div className="py-20 text-center">
        <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="font-semibold mb-2">No grade selected</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Set your grade in your account settings to see your timetable.
        </p>
        <Button asChild size="sm">
          <Link href="/dashboard/account">Go to Account Settings</Link>
        </Button>
      </div>
    )
  }

  const { data: entries } = await supabase
    .from('timetables')
    .select('*')
    .eq('grade_id', grade.id)
    .order('day_of_week')
    .order('start_time')

  // Group by day
  const byDay: Record<number, typeof entries> = {}
  for (const e of entries ?? []) {
    if (!byDay[e.day_of_week]) byDay[e.day_of_week] = []
    byDay[e.day_of_week]!.push(e)
  }

  const hasTimetable = (entries?.length ?? 0) > 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">My Timetable</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Class schedule for{' '}
          <span
            className="font-medium"
            style={{ color: grade.color }}
          >
            {grade.name}
          </span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">All times shown in Mauritius time (GMT+4).</p>
      </div>

      {hasTimetable ? (
        <div className="space-y-6">
          {DAYS.map((dayName, dayIdx) => {
            const dayEntries = byDay[dayIdx]
            if (!dayEntries?.length) return null
            return (
              <div key={dayIdx}>
                <h2 className="font-semibold mb-3 flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: grade.color }}
                  />
                  {dayName}
                </h2>
                <div className="space-y-2">
                  {dayEntries.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-start gap-4 p-4 rounded-xl border border-border/60 bg-card hover:border-primary/20 transition-colors"
                    >
                      <div className="text-xs font-mono text-muted-foreground whitespace-nowrap pt-0.5 w-24 shrink-0">
                        {e.start_time.slice(0, 5)}<br />{e.end_time.slice(0, 5)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{e.subject}</p>
                        {e.teacher && (
                          <p className="text-xs text-muted-foreground mt-0.5">{e.teacher}</p>
                        )}
                        {e.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">{e.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="py-20 text-center rounded-xl border border-border/60">
          <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No timetable published for {grade.name} yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Check back soon.</p>
        </div>
      )}
    </div>
  )
}

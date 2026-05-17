import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LiveClassSchedule } from '@/components/lc/live-class-schedule'
import { Plus, Pencil, Calendar, Package } from 'lucide-react'

export const metadata = { title: 'Manage Live Classes' }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default async function AdminLiveClassesPage() {
  const supabase = await createClient()

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const { data: classes } = await supabase
    .from('live_classes')
    .select('*, grade:grades(name, color), package:subscription_packages(id, name, month, year)')
    .order('scheduled_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Live Classes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{classes?.length ?? 0} classes total</p>
        </div>
        <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-accent">
          <Link href="/admin/live-classes/new">
            <Plus className="w-4 h-4 mr-1" /> Schedule Class
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border border-border/60 overflow-hidden">
        {classes && classes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-muted/30 border-b border-border/60">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Grade</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Package</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Scheduled</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {classes.map((c) => {
                  const grade = c.grade as { name: string; color: string } | null
                  const pkg = c.package as { id: string; name: string; month: number; year: number } | null
                  const d = new Date(c.scheduled_at)
                  const classMonth = d.getMonth() + 1
                  const classYear = d.getFullYear()
                  const isCurrentMonth = classMonth === currentMonth && classYear === currentYear
                  const isPastMonth = classYear < currentYear || (classYear === currentYear && classMonth < currentMonth)
                  return (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium line-clamp-1 max-w-[180px] block">{c.title}</span>
                      </td>
                      <td className="px-4 py-3">
                        {grade && (
                          <Badge
                            variant="outline"
                            style={{ borderColor: `${grade.color}40`, color: grade.color }}
                          >
                            {grade.name}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {pkg ? (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Package className="w-3 h-3 shrink-0" />
                            {pkg.name} — {MONTHS[pkg.month - 1]} {pkg.year}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        <span className="flex items-start gap-1">
                          <Calendar className="w-3 h-3 mt-0.5 shrink-0" />
                          <LiveClassSchedule
                            scheduledAt={c.scheduled_at}
                            isRecurring={(c as any).is_recurring ?? false}
                            recurrenceDayOfWeek={(c as any).recurrence_day_of_week ?? null}
                            endTime={(c as any).end_time ?? null}
                          />
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex text-xs px-2 py-0.5 rounded-full ${
                          !c.is_published
                            ? 'bg-secondary text-muted-foreground'
                            : isPastMonth
                            ? 'bg-muted text-muted-foreground'
                            : isCurrentMonth
                            ? 'bg-primary/10 text-primary'
                            : 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400'
                        }`}>
                          {!c.is_published ? 'Draft' : isPastMonth ? 'Ended' : isCurrentMonth ? 'Active' : 'Upcoming'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/live-classes/${c.id}/edit`}>
                            <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="text-muted-foreground mb-4">No live classes scheduled yet.</p>
            <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-accent">
              <Link href="/admin/live-classes/new">
                <Plus className="w-4 h-4 mr-1" /> Schedule First Class
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

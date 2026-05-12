import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Calendar } from 'lucide-react'

export const metadata = { title: 'Manage Live Classes' }

export default async function AdminLiveClassesPage() {
  const supabase = await createClient()

  const { data: classes } = await supabase
    .from('live_classes')
    .select('*, grade:grades(name, color)')
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
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border/60">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Grade</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Scheduled</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Price</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {classes.map((c) => {
                const grade = c.grade as { name: string; color: string } | null
                const isPast = new Date(c.scheduled_at) < new Date()
                return (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium line-clamp-1 max-w-xs block">{c.title}</span>
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
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(c.scheduled_at).toLocaleDateString('en-MU', { dateStyle: 'medium' })}
                        {' '}
                        {new Date(c.scheduled_at).toLocaleTimeString('en-MU', { timeStyle: 'short' })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.price === 0 ? (
                        <span className="text-primary font-medium">Free</span>
                      ) : (
                        <span>Rs {c.price}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs px-2 py-0.5 rounded-full ${
                        !c.is_published
                          ? 'bg-secondary text-muted-foreground'
                          : isPast
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {!c.is_published ? 'Draft' : isPast ? 'Ended' : 'Upcoming'}
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

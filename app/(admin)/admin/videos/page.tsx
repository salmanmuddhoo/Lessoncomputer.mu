import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Clock, Eye, EyeOff } from 'lucide-react'

export const metadata = { title: 'Manage Videos' }

export default async function AdminVideosPage() {
  const supabase = await createClient()

  const { data: videos } = await supabase
    .from('videos')
    .select('*, grade:grades(name, color)')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Videos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{videos?.length ?? 0} videos total</p>
        </div>
        <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-accent">
          <Link href="/admin/videos/new">
            <Plus className="w-4 h-4 mr-1" /> Add Video
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border border-border/60 overflow-hidden">
        {videos && videos.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border/60">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Grade</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Price</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Duration</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {videos.map((v) => (
                <tr key={v.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium line-clamp-1 max-w-xs block">{v.title}</span>
                  </td>
                  <td className="px-4 py-3">
                    {v.grade && (
                      <Badge
                        variant="outline"
                        style={{ borderColor: `${(v.grade as { name: string; color: string }).color}40`, color: (v.grade as { name: string; color: string }).color }}
                      >
                        {(v.grade as { name: string; color: string }).name}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {v.is_free ? (
                      <span className="text-primary font-medium">Free</span>
                    ) : (
                      <span>Rs {v.price}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                      v.is_published
                        ? 'bg-primary/10 text-primary'
                        : 'bg-secondary text-muted-foreground'
                    }`}>
                      {v.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {v.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {v.duration_minutes ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {v.duration_minutes}m
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/videos/${v.id}/edit`}>
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-16 text-center">
            <p className="text-muted-foreground mb-4">No videos uploaded yet.</p>
            <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-accent">
              <Link href="/admin/videos/new">
                <Plus className="w-4 h-4 mr-1" /> Upload Your First Video
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

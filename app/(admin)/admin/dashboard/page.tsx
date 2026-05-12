import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Video, Radio, GraduationCap, TrendingUp, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata = { title: 'Admin Dashboard' }

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const [
    { count: studentCount },
    { count: videoCount },
    { count: liveClassCount },
    { count: gradeCount },
    { data: recentVideos },
    { data: recentPurchases },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('videos').select('*', { count: 'exact', head: true }),
    supabase.from('live_classes').select('*', { count: 'exact', head: true }),
    supabase.from('grades').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('videos').select('id, title, created_at, is_published').order('created_at', { ascending: false }).limit(5),
    supabase.from('purchases').select('id, amount, status, created_at').eq('status', 'completed').order('created_at', { ascending: false }).limit(5),
  ])

  const totalRevenue = recentPurchases?.reduce((sum, p) => sum + p.amount, 0) ?? 0

  const STATS = [
    { label: 'Total Students', value: studentCount ?? 0, icon: Users, href: '/admin/students' },
    { label: 'Video Lessons', value: videoCount ?? 0, icon: Video, href: '/admin/videos' },
    { label: 'Live Classes', value: liveClassCount ?? 0, icon: Radio, href: '/admin/live-classes' },
    { label: 'Active Grades', value: gradeCount ?? 0, icon: GraduationCap, href: '/admin/grades' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Overview of LessonComputer.mu</p>
        </div>
        <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-accent">
          <Link href="/admin/videos/new">+ Add Video</Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STATS.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="border-border/60 hover:border-primary/30 transition-colors lc-card-hover">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <stat.icon className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <p className="text-3xl font-bold">{stat.value.toLocaleString()}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Videos */}
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Recent Videos</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/videos">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentVideos?.length ? (
              recentVideos.map((v) => (
                <div key={v.id} className="flex items-center justify-between text-sm">
                  <Link href={`/admin/videos/${v.id}/edit`} className="font-medium hover:text-primary truncate max-w-[200px]">
                    {v.title}
                  </Link>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${v.is_published ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                    {v.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No videos yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Purchases */}
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Recent Purchases</CardTitle>
            <span className="text-sm text-muted-foreground">Total: Rs {totalRevenue.toLocaleString()}</span>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentPurchases?.length ? (
              recentPurchases.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground text-xs">
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                  <span className="font-semibold text-primary">Rs {p.amount}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No purchases yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

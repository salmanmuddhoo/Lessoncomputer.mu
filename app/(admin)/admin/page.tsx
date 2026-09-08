import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Video, Radio, BookOpen } from 'lucide-react'
import { formatMoney } from '@/lib/currency-format'

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
    // Real payments live in mips_orders (video AND live purchases alike) — the legacy
    // `purchases` table is never written to, so it always showed empty here.
    (supabase as any)
      .from('mips_orders')
      .select('id, student_id, order_type, amount, currency, description, created_at')
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(6),
  ])

  const purchaseRows = (recentPurchases ?? []) as { id: string; student_id: string; order_type: string; amount: number; currency: string; description: string | null; created_at: string }[]
  const purchaseStudentIds = [...new Set(purchaseRows.map((p) => p.student_id))]
  const purchaseStudentMap: Record<string, string | null> = {}
  if (purchaseStudentIds.length > 0) {
    const { data: purchaseProfiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', purchaseStudentIds)
    for (const p of (purchaseProfiles ?? []) as { id: string; full_name: string | null }[]) {
      purchaseStudentMap[p.id] = p.full_name
    }
  }

  const STATS = [
    { label: 'Total Students', value: studentCount ?? 0, icon: Users,    href: '/admin/students' },
    { label: 'Video Lessons',  value: videoCount ?? 0,   icon: Video,    href: '/admin/videos' },
    { label: 'Live Classes',   value: liveClassCount ?? 0, icon: Radio,  href: '/admin/live-classes' },
    { label: 'Active Grades',  value: gradeCount ?? 0,   icon: BookOpen, href: '/admin/grades' },
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STATS.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="border-border/60 hover:border-primary/30 transition-colors">
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
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Recent Videos</CardTitle>
            <Button variant="ghost" size="sm" asChild><Link href="/admin/videos">View all</Link></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentVideos?.length ? recentVideos.map((v) => (
              <div key={v.id} className="flex items-center justify-between text-sm">
                <Link href={`/admin/videos/${v.id}/edit`} className="font-medium hover:text-primary truncate max-w-[200px]">{v.title}</Link>
                <span className={`text-xs px-2 py-0.5 rounded-full ${v.is_published ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                  {v.is_published ? 'Published' : 'Draft'}
                </span>
              </div>
            )) : <p className="text-sm text-muted-foreground py-4 text-center">No videos yet.</p>}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Recent Purchases</CardTitle>
            <Button variant="ghost" size="sm" asChild><Link href="/admin/payments">View all</Link></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {purchaseRows.length ? purchaseRows.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{purchaseStudentMap[p.student_id] ?? 'Unknown student'}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.description ?? (p.order_type === 'live' ? 'Live classes' : 'Video package')}
                    {' · '}{new Date(p.created_at).toLocaleDateString('en-MU', { dateStyle: 'medium' })}
                  </p>
                </div>
                <span className="font-semibold text-primary shrink-0">{formatMoney(Number(p.amount))}</span>
              </div>
            )) : <p className="text-sm text-muted-foreground py-4 text-center">No purchases yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

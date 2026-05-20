import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Megaphone, Users, Radio, Video, Inbox } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Messages' }

const AUDIENCE_META: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  all:   { label: 'All Students',        icon: Users,  className: 'bg-primary/10 text-primary border-primary/20' },
  live:  { label: 'Live Classes',        icon: Radio,  className: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800' },
  video: { label: 'Video Packages',      icon: Video,  className: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-800' },
}

export default async function StudentNoticesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRaw } = await (supabase as any)
    .from('profiles')
    .select('grade_id')
    .eq('id', user.id)
    .single()
  const profile = profileRaw as { grade_id: string | null } | null

  if (!profile?.grade_id) {
    return (
      <div className="py-20 text-center">
        <Inbox className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground">No grade assigned to your account.</p>
      </div>
    )
  }

  // Determine which subscription types this student has
  const { data: subs } = await supabase
    .from('student_subscriptions')
    .select('package:subscription_packages(package_type)')
    .eq('student_id', user.id)
    .eq('status', 'active')

  const hasLive = (subs ?? []).some((s: any) => s.package?.package_type === 'live_month')
  const hasVideo = (subs ?? []).some((s: any) => s.package?.package_type !== 'live_month')

  // Fetch broadcasts for this student's grade + matching audience
  const audienceFilter = ['all']
  if (hasLive) audienceFilter.push('live')
  if (hasVideo) audienceFilter.push('video')

  const { data: notices } = await (supabase as any)
    .from('broadcasts')
    .select('id, title, body, target_audience, created_at')
    .eq('grade_id', profile.grade_id)
    .in('target_audience', audienceFilter)
    .order('created_at', { ascending: false })

  const items = (notices ?? []) as Array<{
    id: string
    title: string
    body: string
    target_audience: string
    created_at: string
  }>

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Homework, announcements and messages from your teacher
          </p>
        </div>
        {items.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">{items.length} notice{items.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-20 text-center rounded-xl border border-border/60">
          <Megaphone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No notices yet. Check back later!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const meta = AUDIENCE_META[item.target_audience] ?? AUDIENCE_META.all
            const Icon = meta.icon
            return (
              <div
                key={item.id}
                className="rounded-xl border border-border/60 p-5 hover:border-primary/30 hover:bg-primary/5 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Megaphone className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{item.title}</h3>
                      <Badge variant="outline" className={`gap-1 text-[10px] px-1.5 py-0 h-4 ${meta.className}`}>
                        <Icon className="w-2.5 h-2.5" />
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{item.body}</p>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      {new Date(item.created_at).toLocaleDateString('en-GB', { dateStyle: 'long' })}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

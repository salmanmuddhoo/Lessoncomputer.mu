import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Megaphone, Inbox } from 'lucide-react'
import { NoticesList } from '@/components/lc/notices-list'

export const metadata: Metadata = { title: 'Messages' }

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

  const audienceFilter = ['all']
  if (hasLive) audienceFilter.push('live')
  if (hasVideo) audienceFilter.push('video')

  const { data: notices } = await (supabase as any)
    .from('broadcasts')
    .select('id, title, body, target_audience, created_at, chapter_id, chapter:chapters(title)')
    .eq('grade_id', profile.grade_id)
    .in('target_audience', audienceFilter)
    .order('created_at', { ascending: false })

  const items = (notices ?? []) as Array<{
    id: string
    title: string
    body: string
    target_audience: string
    created_at: string
    chapter_id: string | null
    chapter: { title: string } | null
  }>

  // Mark all visible messages as read so the dashboard's unread badge clears.
  if (items.length > 0) {
    await (supabase as any)
      .from('broadcast_reads')
      .upsert(
        items.map((i) => ({ student_id: user.id, broadcast_id: i.id })),
        { onConflict: 'student_id,broadcast_id' }
      )
  }

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
          <span className="ml-auto text-xs text-muted-foreground">{items.length} message{items.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-20 text-center rounded-xl border border-border/60">
          <Megaphone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No messages yet. Check back later!</p>
        </div>
      ) : (
        <NoticesList items={items} />
      )}
    </div>
  )
}

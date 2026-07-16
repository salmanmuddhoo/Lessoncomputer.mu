import { redirect } from 'next/navigation'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { StudentSidebar } from '@/components/lc/student-sidebar'
import { WhatsAppButton } from '@/components/lc/whatsapp-button'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, { data: subs }, { data: siteSettingsRaw }] = await Promise.all([
    supabase
      .from('profiles')
      .select('role, full_name, grade_id, grade:grades(name)')
      .eq('id', user.id)
      .single(),
    supabase
      .from('student_subscriptions')
      .select('is_recurring, subscription_type, valid_from, valid_until, package:subscription_packages(package_type)')
      .eq('student_id', user.id)
      .eq('status', 'active'),
    (supabase as any)
      .from('site_settings')
      .select('whatsapp_number')
      .eq('id', 1)
      .single(),
  ])

  // Redirect admins to the admin panel
  if (profile?.role === 'admin') redirect('/admin')

  let userName = (profile as any)?.full_name ?? null
  let gradeName = (profile?.grade as { name: string } | null)?.name ?? null

  // Safety net: if the name/grade captured at signup never landed on the profile
  // (e.g. the confirmation-email redirect skipped /api/auth/callback, or the DB
  // trigger wasn't applied), backfill it here from the auth metadata. Uses the
  // service role so it works regardless of RLS, and is a no-op once populated.
  const meta = (user.user_metadata ?? {}) as { full_name?: string; grade_id?: string }
  const noProfileRow = !profile
  const missingName = !userName && meta.full_name
  const missingGrade = !(profile as any)?.grade_id && meta.grade_id
  if (noProfileRow || missingName || missingGrade) {
    try {
      const admin = createServiceRoleClient()
      // Upsert so a user with no profiles row at all also gets one created (ON CONFLICT
      // DO NOTHING preserves any values an existing row already has).
      if (noProfileRow) {
        await (admin as any).from('profiles').upsert(
          { id: user.id, full_name: meta.full_name ?? null, grade_id: meta.grade_id ?? null },
          { onConflict: 'id', ignoreDuplicates: true }
        )
        if (meta.full_name) userName = meta.full_name
        if (meta.grade_id) {
          const { data: g } = await (admin as any).from('grades').select('name').eq('id', meta.grade_id).single()
          gradeName = g?.name ?? gradeName
        }
      } else {
        const patch: Record<string, unknown> = {}
        if (missingName) patch.full_name = meta.full_name
        if (missingGrade) patch.grade_id = meta.grade_id
        const { error } = await (admin as any).from('profiles').update(patch).eq('id', user.id)
        if (!error) {
          if (patch.full_name) userName = patch.full_name as string
          if (patch.grade_id) {
            const { data: g } = await (admin as any).from('grades').select('name').eq('id', patch.grade_id).single()
            gradeName = g?.name ?? gradeName
          }
        }
      }
    } catch (e) {
      console.error('[student/layout] profile backfill failed:', e)
    }
  }

  const whatsappNumber = (siteSettingsRaw as any)?.whatsapp_number ?? null

  // Live access lasts for the month the student PAID for — until valid_until — not
  // only while recurring is on. Cancelling recurring stops next month's auto-charge
  // but must NOT revoke access to the current, already-paid month. (is_recurring only
  // controls renewal; the paid period is valid_from..valid_until.)
  const muToday = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().split('T')[0] // Mauritius (UTC+4)
  const isCurrentLive = (s: any) =>
    (s.subscription_type === 'live' || s.package?.package_type === 'live_month') &&
    (!s.valid_from || s.valid_from <= muToday) &&
    (!s.valid_until || s.valid_until >= muToday)
  const hasLiveSubscription = (subs ?? []).some(isCurrentLive)
  const hasVideoSubscription = (subs ?? []).some(
    (s: any) => s.package?.package_type !== 'live_month'
  )

  return (
    <div className="flex bg-background h-screen overflow-hidden">
      <StudentSidebar
        userName={userName}
        gradeName={gradeName}
        hasLiveSubscription={hasLiveSubscription}
        hasVideoSubscription={hasVideoSubscription}
      />
      {/* Only the main area scrolls — the sidebar stays fixed on every page */}
      <main className="flex-1 h-screen overflow-y-auto pt-14 md:pt-0">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
      {whatsappNumber && <WhatsAppButton phoneNumber={whatsappNumber} />}
    </div>
  )
}

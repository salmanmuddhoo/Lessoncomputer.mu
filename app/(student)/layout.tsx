import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StudentSidebar } from '@/components/lc/student-sidebar'
import { WhatsAppButton } from '@/components/lc/whatsapp-button'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, { data: subs }, { data: siteSettingsRaw }] = await Promise.all([
    supabase
      .from('profiles')
      .select('role, full_name, grade:grades(name)')
      .eq('id', user.id)
      .single(),
    supabase
      .from('student_subscriptions')
      .select('is_recurring, subscription_type, package:subscription_packages(package_type)')
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

  const gradeName = (profile?.grade as { name: string } | null)?.name ?? null
  const whatsappNumber = (siteSettingsRaw as any)?.whatsapp_number ?? null

  // Live-class resources require an ONGOING recurring subscription. Once a student
  // cancels recurring (or it lapses), the Live Classes & Attendance menus disappear
  // until they subscribe again.
  const hasLiveSubscription = (subs ?? []).some(
    (s: any) => s.is_recurring && (s.subscription_type === 'live' || s.package?.package_type === 'live_month')
  )
  const hasVideoSubscription = (subs ?? []).some(
    (s: any) => s.package?.package_type !== 'live_month'
  )

  return (
    <div className="flex bg-background">
      <StudentSidebar
        userName={profile?.full_name}
        gradeName={gradeName}
        hasLiveSubscription={hasLiveSubscription}
        hasVideoSubscription={hasVideoSubscription}
      />
      <main className="flex-1 min-h-screen pt-14 md:pt-0">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
      {whatsappNumber && <WhatsAppButton phoneNumber={whatsappNumber} />}
    </div>
  )
}

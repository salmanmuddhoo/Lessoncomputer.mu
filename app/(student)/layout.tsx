import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StudentSidebar } from '@/components/lc/student-sidebar'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, { data: subs }] = await Promise.all([
    supabase
      .from('profiles')
      .select('role, full_name, grade:grades(name)')
      .eq('id', user.id)
      .single(),
    supabase
      .from('student_subscriptions')
      .select('package:subscription_packages(package_type)')
      .eq('student_id', user.id)
      .eq('status', 'active'),
  ])

  // Redirect admins to the admin panel
  if (profile?.role === 'admin') redirect('/admin')

  const gradeName = (profile?.grade as { name: string } | null)?.name ?? null

  const hasLiveSubscription = (subs ?? []).some(
    (s: any) => s.package?.package_type === 'live_month'
  )
  const hasVideoSubscription = (subs ?? []).some(
    (s: any) => s.package?.package_type !== 'live_month'
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <StudentSidebar
        userName={profile?.full_name}
        gradeName={gradeName}
        hasLiveSubscription={hasLiveSubscription}
        hasVideoSubscription={hasVideoSubscription}
      />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StudentSidebar } from '@/components/lc/student-sidebar'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, grade:grades(name)')
    .eq('id', user.id)
    .single()

  // Redirect admins to the admin panel
  if (profile?.role === 'admin') redirect('/admin')

  const gradeName = (profile?.grade as { name: string } | null)?.name ?? null

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <StudentSidebar userName={profile?.full_name} gradeName={gradeName} />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

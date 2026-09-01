import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Finance is a client page, so gate access here (server) — only admins granted finance
// access may view it. A restricted admin is sent back to the admin dashboard.
export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('role, can_access_finance')
    .eq('id', user.id)
    .single()

  if ((me as any)?.role !== 'admin') redirect('/dashboard')
  if ((me as any)?.can_access_finance !== true) redirect('/admin')

  return <>{children}</>
}

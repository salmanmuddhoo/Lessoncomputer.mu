import { Header } from '@/components/lc/header'
import { Footer } from '@/components/lc/footer'
import { createClient } from '@/lib/supabase/server'

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <>
      <Header user={user ? { email: user.email, role: profile?.role } : null} />
      <main>{children}</main>
      <Footer />
    </>
  )
}

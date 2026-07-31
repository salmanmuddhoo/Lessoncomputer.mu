import { Header } from '@/components/lc/header'
import { Footer } from '@/components/lc/footer'
import { WhatsAppButton } from '@/components/lc/whatsapp-button'
import { createClient } from '@/lib/supabase/server'
import { getCurrencyInfo } from '@/lib/currency'
import { CurrencyProvider } from '@/components/lc/currency-provider'

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

  let whatsappNumber: string | null = null
  try {
    const { data: ss } = await (supabase as any)
      .from('site_settings')
      .select('whatsapp_number')
      .eq('id', 1)
      .single()
    whatsappNumber = ss?.whatsapp_number ?? null
  } catch { /* table may not exist yet */ }

  const currency = await getCurrencyInfo()

  let grades: { name: string; slug: string }[] = []
  try {
    const { data } = await supabase
      .from('grades')
      .select('name, slug')
      .eq('is_active', true)
      .order('order_index', { ascending: true })
    grades = (data ?? []) as { name: string; slug: string }[]
  } catch { /* fall back to empty */ }

  return (
    <CurrencyProvider value={currency}>
      <Header user={user ? { email: user.email, role: profile?.role } : null} grades={grades} />
      <main className="pt-[72px]">{children}</main>
      <Footer />
      {whatsappNumber && <WhatsAppButton phoneNumber={whatsappNumber} />}
    </CurrencyProvider>
  )
}

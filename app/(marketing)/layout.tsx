import { Header } from '@/components/lc/header'
import { Footer } from '@/components/lc/footer'
import { TopBanner } from '@/components/lc/top-banner'
import { WhatsAppButton } from '@/components/lc/whatsapp-button'
import { createClient } from '@/lib/supabase/server'
import { getCurrencyInfo } from '@/lib/currency'
import { CurrencyProvider } from '@/components/lc/currency-provider'

// Force fresh data on every navigation — otherwise Next.js can serve a client-cached copy of
// this layout (and its Header/Footer, which read site_settings for social links and WhatsApp
// number) after an admin update, so different pages briefly show different values depending on
// when each was last fetched.
export const dynamic = 'force-dynamic'

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
  let banner: { enabled: boolean; text: string | null; link: string | null } | null = null
  try {
    const { data: ss } = await (supabase as any)
      .from('site_settings')
      .select('whatsapp_number, banner_enabled, banner_text, banner_link')
      .eq('id', 1)
      .single()
    whatsappNumber = ss?.whatsapp_number ?? null
    banner = ss ? { enabled: !!ss.banner_enabled, text: ss.banner_text, link: ss.banner_link } : null
  } catch { /* table may not exist yet */ }
  const showBanner = !!(banner?.enabled && banner.text?.trim())

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
      {showBanner && <TopBanner text={banner!.text!} link={banner!.link} />}
      <Header user={user ? { email: user.email, role: profile?.role } : null} grades={grades} hasBanner={showBanner} />
      <main className={showBanner ? 'pt-[104px]' : 'pt-[72px]'}>{children}</main>
      <Footer />
      {whatsappNumber && <WhatsAppButton phoneNumber={whatsappNumber} />}
    </CurrencyProvider>
  )
}

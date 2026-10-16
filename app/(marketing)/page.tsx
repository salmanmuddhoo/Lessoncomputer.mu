import { createClient } from '@/lib/supabase/server'
import { Hero } from '@/components/lc/hero'
import { TeacherSection } from '@/components/lc/teacher-section'
import { TrustBadges } from '@/components/lc/trust-badges'
import { StatsSection } from '@/components/lc/stats-section'
import { GradesSection } from '@/components/lc/grades-section'
import { FeaturesSection } from '@/components/lc/features-section'
import { Testimonials } from '@/components/lc/testimonials'
import { CTASection } from '@/components/lc/cta-section'
import { Newsletter } from '@/components/lc/newsletter'
import type { Grade } from '@/lib/types/database'
import type { Metadata } from 'next'
import { JsonLd } from '@/components/lc/json-ld'
import { DEFAULT_OG_IMAGE, ORGANIZATION_ID, SITE_NAME, SITE_URL, organizationJsonLd } from '@/lib/seo'

const HOME_TITLE = 'Cambridge Computer Science Online Tuition — IGCSE 0478, O Level 2210, A Level 9618'
const HOME_SOCIAL_TITLE = 'Cambridge Computer Science Online Tuition | LessonComputer.mu'
const HOME_SOCIAL_DESCRIPTION = 'Cambridge Computer Science taught live from Mauritius, to students anywhere in the world.'

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  alternates: { canonical: '/' },
  openGraph: {
    title: HOME_SOCIAL_TITLE,
    description: HOME_SOCIAL_DESCRIPTION,
    siteName: SITE_NAME,
    url: '/',
    type: 'website',
    locale: 'en_US',
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_SOCIAL_TITLE,
    description: HOME_SOCIAL_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
}

export default async function HomePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  let dashboardHref = '/dashboard'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role === 'admin') dashboardHref = '/admin'
  }

  const { data: gradesData } = await supabase
    .from('grades')
    .select('*, videos(count), live_classes(count)')
    .eq('is_active', true)
    .order('order_index')

  const grades = gradesData?.map((g) => ({
    ...g,
    videoCount: (g.videos as unknown as { count: number }[])?.[0]?.count ?? 0,
    liveClassCount: (g.live_classes as unknown as { count: number }[])?.[0]?.count ?? 0,
  })) as (Grade & { videoCount: number; liveClassCount: number })[] | undefined

  const { data: testimonials } = await (supabase as any)
    .from('testimonials')
    .select('id, type, author_name, author_role, quote, media_url')
    .eq('is_published', true)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: false })

  let sameAs: string[] = []
  try {
    const { data: social } = await (supabase as any)
      .from('site_settings')
      .select('facebook_url, instagram_url, tiktok_url')
      .eq('id', 1)
      .single()
    sameAs = [social?.facebook_url, social?.instagram_url, social?.tiktok_url].filter(Boolean)
  } catch { /* table may not exist yet */ }

  return (
    <>
      <JsonLd
        data={[
          organizationJsonLd(sameAs),
          { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: SITE_NAME, url: `${SITE_URL}/`, publisher: { '@id': ORGANIZATION_ID } },
        ]}
      />
      {/* 1. Hero — large serif headline, two CTAs */}
      <Hero />

      {/* 2. Meet the teacher — builds trust near the top */}
      <TeacherSection />

      {/* 3. Trust badges — yellow strip, like Boty */}
      <TrustBadges />

      {/* 4. Stats bar */}
      <StatsSection />

      {/* 5. Grade grid — "the boxes" like Boty product grid */}
      <GradesSection grades={grades ?? undefined} />

      {/* 6. Feature cards */}
      <FeaturesSection />

      {/* 7. Testimonials */}
      <Testimonials items={testimonials ?? []} />

      {/* 8. CTA banner — dark block */}
      <CTASection isLoggedIn={!!user} dashboardHref={dashboardHref} />

      {/* 9. Newsletter */}
      <Newsletter />
    </>
  )
}

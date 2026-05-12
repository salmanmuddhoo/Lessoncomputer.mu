import { createClient } from '@/lib/supabase/server'
import { Hero } from '@/components/lc/hero'
import { TrustBadges } from '@/components/lc/trust-badges'
import { StatsSection } from '@/components/lc/stats-section'
import { GradesSection } from '@/components/lc/grades-section'
import { FeaturesSection } from '@/components/lc/features-section'
import { Testimonials } from '@/components/lc/testimonials'
import { CTASection } from '@/components/lc/cta-section'
import { Newsletter } from '@/components/lc/newsletter'
import type { Grade } from '@/lib/types/database'

export default async function HomePage() {
  const supabase = await createClient()

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

  return (
    <>
      {/* 1. Hero — large serif headline, two CTAs */}
      <Hero />

      {/* 2. Trust badges — yellow strip, like Boty */}
      <TrustBadges />

      {/* 3. Stats bar */}
      <StatsSection />

      {/* 4. Grade grid — "the boxes" like Boty product grid */}
      <GradesSection grades={grades ?? undefined} />

      {/* 5. Feature cards */}
      <FeaturesSection />

      {/* 6. Testimonials */}
      <Testimonials />

      {/* 7. CTA banner — dark block */}
      <CTASection />

      {/* 8. Newsletter */}
      <Newsletter />
    </>
  )
}

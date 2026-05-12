import { Hero } from '@/components/lc/hero'
import { StatsSection } from '@/components/lc/stats-section'
import { GradesSection } from '@/components/lc/grades-section'
import { FeaturesSection } from '@/components/lc/features-section'
import { CTASection } from '@/components/lc/cta-section'
import { createClient } from '@/lib/supabase/server'
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
      <Hero />
      <StatsSection />
      <GradesSection grades={grades ?? undefined} />
      <FeaturesSection />
      <CTASection />
    </>
  )
}

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { GradesSection } from '@/components/lc/grades-section'
import type { Grade } from '@/lib/types/database'

export const metadata: Metadata = {
  title: 'All Grades | LessonComputer.mu',
  description: 'Browse video lessons and live classes for Grades 7 to 12 on LessonComputer.mu — Mauritius\'s online learning platform.',
  openGraph: {
    title: 'All Grades | LessonComputer.mu',
    description: 'Browse video lessons and live classes for Grades 7 to 12.',
    siteName: 'LessonComputer.mu',
  },
}

export default async function GradesPage() {
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-10 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Browse by Grade</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Select your grade to access video lessons and live classes tailored to the Mauritian curriculum.
        </p>
      </div>
      <GradesSection grades={grades ?? undefined} embedded />
    </div>
  )
}

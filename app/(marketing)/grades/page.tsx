import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { GradesSection } from '@/components/lc/grades-section'
import type { Grade } from '@/lib/types/database'

export const metadata: Metadata = {
  title: 'Courses',
  description: 'Browse Cambridge IGCSE 0478, O Level 2210 and AS & A Level 9618 Computer Science courses on LessonComputer.mu — video lessons and live classes, taught from Mauritius, open to students worldwide.',
  alternates: { canonical: '/grades' },
  openGraph: {
    title: 'Courses | LessonComputer.mu',
    description: 'Browse Cambridge IGCSE, O Level and A Level Computer Science courses — video lessons and live classes, open to students worldwide.',
    siteName: 'LessonComputer.mu',
    url: '/grades',
    type: 'website',
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
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Browse Courses</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Select your Cambridge syllabus to access video lessons and live classes — taught from
          Mauritius, open to students worldwide.
        </p>
      </div>
      <GradesSection grades={grades ?? undefined} embedded />
    </div>
  )
}

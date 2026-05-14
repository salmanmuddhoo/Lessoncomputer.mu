import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VideoForm } from '@/components/lc/video-form'
import type { PackageOption } from '@/components/lc/video-form'

export const metadata = { title: 'Edit Video' }

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditVideoPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: video }, { data: rawPackages }] = await Promise.all([
    supabase.from('videos').select('*').eq('id', id).single(),
    supabase
      .from('subscription_packages')
      .select('id, name, grade_id, month, year, subscription_package_chapters(chapter_id, chapter:chapters(id, title, order_index))')
      .eq('is_active', true)
      .order('year', { ascending: false })
      .order('month', { ascending: false }),
  ])

  if (!video) notFound()

  const packages: PackageOption[] = (rawPackages ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    grade_id: p.grade_id,
    month: p.month,
    year: p.year,
    chapters: (p.subscription_package_chapters ?? [])
      .map((spc: any) => spc.chapter)
      .filter(Boolean),
  }))

  // Pre-select the package that contains the video's chapter
  let initialPackageId = ''
  if (video.chapter_id) {
    const match = packages.find((p) => p.chapters.some((ch) => ch.id === video.chapter_id))
    initialPackageId = match?.id ?? ''
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Edit Video</h1>
        <p className="text-muted-foreground text-sm mt-0.5 truncate">{video.title}</p>
      </div>
      <VideoForm packages={packages} video={video} initialPackageId={initialPackageId} />
    </div>
  )
}

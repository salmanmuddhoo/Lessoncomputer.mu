import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VideoForm } from '@/components/lc/video-form'

export const metadata = { title: 'Edit Video' }

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditVideoPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: video }, { data: grades }] = await Promise.all([
    supabase.from('videos').select('*').eq('id', id).single(),
    supabase.from('grades').select('id, name, color').eq('is_active', true).order('order_index'),
  ])

  if (!video) notFound()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Edit Video</h1>
        <p className="text-muted-foreground text-sm mt-0.5 truncate">{video.title}</p>
      </div>
      <VideoForm grades={grades ?? []} video={video} />
    </div>
  )
}

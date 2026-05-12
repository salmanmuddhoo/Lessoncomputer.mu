import { createClient } from '@/lib/supabase/server'
import { VideoForm } from '@/components/lc/video-form'

export const metadata = { title: 'Add New Video' }

export default async function NewVideoPage() {
  const supabase = await createClient()

  const { data: grades } = await supabase
    .from('grades')
    .select('id, name, color')
    .eq('is_active', true)
    .order('order_index')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Add New Video</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Paste a Streamable URL to add a video lesson.</p>
      </div>
      <VideoForm grades={grades ?? []} />
    </div>
  )
}

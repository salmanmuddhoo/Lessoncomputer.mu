import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LiveClassForm } from '@/components/lc/live-class-form'

export const metadata = { title: 'Edit Live Class' }

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditLiveClassPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: liveClass }, { data: grades }] = await Promise.all([
    supabase.from('live_classes').select('*').eq('id', id).single(),
    supabase.from('grades').select('id, name, color').eq('is_active', true).order('order_index'),
  ])

  if (!liveClass) notFound()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Edit Live Class</h1>
        <p className="text-muted-foreground text-sm mt-0.5 truncate">{liveClass.title}</p>
      </div>
      <LiveClassForm grades={grades ?? []} liveClass={liveClass} />
    </div>
  )
}

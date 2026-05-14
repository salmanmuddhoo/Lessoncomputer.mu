import { createClient } from '@/lib/supabase/server'
import { VideoForm } from '@/components/lc/video-form'
import type { PackageOption } from '@/components/lc/video-form'

export const metadata = { title: 'Add New Video' }

export default async function NewVideoPage() {
  const supabase = await createClient()

  const { data: rawPackages } = await supabase
    .from('subscription_packages')
    .select('id, name, grade_id, month, year, subscription_package_chapters(chapter_id, chapter:chapters(id, title, order_index))')
    .eq('is_active', true)
    .order('year', { ascending: false })
    .order('month', { ascending: false })

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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Add New Video</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Select a subscription package and paste a Streamable URL.</p>
      </div>
      <VideoForm packages={packages} />
    </div>
  )
}

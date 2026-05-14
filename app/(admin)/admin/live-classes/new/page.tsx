import { createClient } from '@/lib/supabase/server'
import { LiveClassForm } from '@/components/lc/live-class-form'

export const metadata = { title: 'Schedule Live Class' }

export default async function NewLiveClassPage() {
  const supabase = await createClient()

  const [{ data: grades }, { data: rawPackages }] = await Promise.all([
    supabase.from('grades').select('id, name, color').eq('is_active', true).order('order_index'),
    supabase
      .from('subscription_packages')
      .select('id, name, grade_id, month, year')
      .eq('is_active', true)
      .order('year', { ascending: false })
      .order('month', { ascending: false }),
  ])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Schedule Live Class</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Create a new live class session for students.</p>
      </div>
      <LiveClassForm grades={grades ?? []} packages={rawPackages ?? []} />
    </div>
  )
}

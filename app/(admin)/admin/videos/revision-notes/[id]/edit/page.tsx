import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RevisionNotesForm } from '@/components/lc/revision-notes-form'
import type { PackageOption } from '@/components/lc/video-form'

export const metadata = { title: 'Edit Revision Notes' }

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditRevisionNotesPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: note }, { data: rawPackages }, { data: gradesData }] = await Promise.all([
    (supabase as any).from('revision_notes').select('*').eq('id', id).single(),
    supabase
      .from('subscription_packages')
      .select('id, name, grade_id, month, year, package_type, subscription_package_chapters(chapter_id, chapter:chapters(id, title, order_index))')
      .eq('is_active', true)
      .order('year', { ascending: false })
      .order('month', { ascending: false }),
    supabase.from('grades').select('id, name, color').eq('is_active', true).order('order_index'),
  ])

  if (!note) notFound()

  const packages: PackageOption[] = (rawPackages ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    grade_id: p.grade_id,
    month: p.month ?? null,
    year: p.year ?? null,
    package_type: p.package_type ?? null,
    chapters: (p.subscription_package_chapters ?? [])
      .map((spc: any) => spc.chapter)
      .filter(Boolean),
  }))

  const grades = (gradesData ?? []).map((g: any) => ({ id: g.id, name: g.name, color: g.color }))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Edit Revision Notes</h1>
        <p className="text-muted-foreground text-sm mt-0.5 truncate">{note.title}</p>
      </div>
      <RevisionNotesForm
        grades={grades}
        packages={packages}
        note={note}
        initialGradeId={note.grade_id}
      />
    </div>
  )
}

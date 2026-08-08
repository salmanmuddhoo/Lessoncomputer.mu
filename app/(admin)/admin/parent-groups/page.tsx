import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { ParentGroupsManager } from '@/components/lc/parent-groups-manager'

export const metadata: Metadata = { title: 'Parent Groups | Admin' }

export default async function ParentGroupsPage() {
  const supabase = await createClient()

  const [{ data: grades }, { data: settings }, { data: groups }, { data: members }] = await Promise.all([
    (supabase as any).from('grades').select('id, name').eq('is_active', true).order('order_index', { ascending: true }),
    (supabase as any).from('site_settings').select('current_academic_year').eq('id', 1).maybeSingle(),
    (supabase as any).from('parent_groups').select('id, grade_id, academic_year, name, whatsapp_group_url'),
    (supabase as any)
      .from('parent_group_members')
      .select('id, parent_group_id, student_id, parent_phone, invite_sent_at, student:profiles(full_name)')
      .order('created_at', { ascending: true }),
  ])

  const membersByCohort: Record<string, any[]> = {}
  for (const m of (members ?? []) as any[]) {
    ;(membersByCohort[m.parent_group_id] ??= []).push({
      id: m.id,
      studentId: m.student_id,
      studentName: (m.student as any)?.full_name ?? null,
      parentPhone: m.parent_phone ?? null,
      inviteSentAt: m.invite_sent_at ?? null,
    })
  }

  const cohorts = ((groups ?? []) as any[]).map((g) => ({
    id: g.id,
    gradeId: g.grade_id,
    academicYear: g.academic_year,
    name: g.name ?? null,
    whatsappGroupUrl: g.whatsapp_group_url ?? null,
    members: membersByCohort[g.id] ?? [],
  }))

  const currentYear = (settings as any)?.current_academic_year ?? new Date().getFullYear()

  return (
    <ParentGroupsManager
      grades={(grades ?? []) as { id: string; name: string }[]}
      cohorts={cohorts}
      currentYear={currentYear}
    />
  )
}

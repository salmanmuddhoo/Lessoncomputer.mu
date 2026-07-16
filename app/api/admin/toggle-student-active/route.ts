import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

// POST /api/admin/toggle-student-active  { studentId, isActive }
// Admin-only. Activates/deactivates a student. Students have no RLS policy allowing
// an admin to update another user's profile, so this runs with the service role after
// verifying the caller is an admin.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if ((me as any)?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { studentId, isActive } = await req.json() as { studentId: string; isActive: boolean }
    if (!studentId || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'studentId and isActive are required' }, { status: 400 })
    }

    const admin = createServiceRoleClient()
    const { error } = await (admin as any)
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', studentId)

    if (error) {
      console.error('[admin/toggle-student-active] update failed:', error)
      return NextResponse.json({ error: 'Could not update the student. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/toggle-student-active]', err)
    return NextResponse.json({ error: 'Could not update the student. Please try again.' }, { status: 500 })
  }
}

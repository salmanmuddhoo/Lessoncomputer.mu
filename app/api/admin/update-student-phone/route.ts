import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

// POST /api/admin/update-student-phone  { studentId, parentPhone }
// Admin-only. Admins have no RLS policy to update another user's profile, so this runs
// with the service role after verifying the caller is an admin.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if ((me as any)?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { studentId, parentPhone } = await req.json() as { studentId: string; parentPhone: string | null }
    if (!studentId) return NextResponse.json({ error: 'studentId is required' }, { status: 400 })

    const cleaned = (parentPhone ?? '').trim() || null

    const admin = createServiceRoleClient()
    const { error } = await (admin as any)
      .from('profiles')
      .update({ parent_phone: cleaned })
      .eq('id', studentId)

    if (error) {
      console.error('[admin/update-student-phone] update failed:', error)
      return NextResponse.json({ error: 'Could not update the phone number. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, parentPhone: cleaned })
  } catch (err) {
    console.error('[admin/update-student-phone]', err)
    return NextResponse.json({ error: 'Could not update the phone number. Please try again.' }, { status: 500 })
  }
}

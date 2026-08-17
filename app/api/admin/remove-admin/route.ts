import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

// POST /api/admin/remove-admin  { adminId }
// Admin-only. Revokes another administrator's admin access by demoting them to a regular
// (student) account. We intentionally do NOT delete the auth account: admins commonly
// authored content (videos/packages/broadcasts) whose foreign keys are ON DELETE RESTRICT,
// so a hard delete would fail. Demoting removes them from the Administrators list reliably.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if ((me as any)?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { adminId } = await req.json() as { adminId?: string }
    if (!adminId) return NextResponse.json({ error: 'Missing admin id.' }, { status: 400 })
    if (adminId === user.id) {
      return NextResponse.json({ error: 'You cannot remove your own admin access.' }, { status: 400 })
    }

    const admin = createServiceRoleClient()

    const { data: target } = await (admin as any)
      .from('profiles')
      .select('role')
      .eq('id', adminId)
      .maybeSingle()
    if (!target) return NextResponse.json({ error: 'That account no longer exists.' }, { status: 404 })
    if ((target as any).role !== 'admin') {
      return NextResponse.json({ error: 'That account is not an administrator.' }, { status: 400 })
    }

    // Service-role write bypasses the privilege-escalation guard (migration 043).
    const { error } = await (admin as any)
      .from('profiles')
      .update({ role: 'student' })
      .eq('id', adminId)

    if (error) {
      console.error('[admin/remove-admin] demote failed:', error)
      return NextResponse.json({ error: 'Could not remove the admin. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/remove-admin]', err)
    return NextResponse.json({ error: 'Could not remove the admin. Please try again.' }, { status: 500 })
  }
}

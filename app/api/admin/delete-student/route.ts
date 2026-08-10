import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

// POST /api/admin/delete-student  { studentId }
// Admin-only. Direct client deletes silently no-op (no admin RLS delete policy on profiles),
// so deletion must go through the service role. Deleting the auth user cascades to the
// profile and all the student's rows (subscriptions, orders, attendance, …).
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { admin } = auth

  const { studentId } = await req.json() as { studentId?: string }
  if (!studentId) return NextResponse.json({ error: 'Missing student.' }, { status: 400 })

  // Never let this route delete an admin account.
  const { data: target } = await (admin as any).from('profiles').select('role').eq('id', studentId).maybeSingle()
  if ((target as any)?.role === 'admin') {
    return NextResponse.json({ error: 'Admin accounts cannot be deleted here.' }, { status: 403 })
  }

  const { error } = await (admin as any).auth.admin.deleteUser(studentId)
  if (error) {
    console.error('[admin/delete-student] deleteUser failed', error)
    return NextResponse.json({ error: 'Could not delete the student. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

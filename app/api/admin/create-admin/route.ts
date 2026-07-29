import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

// POST /api/admin/create-admin  { email, password, fullName }
// Admin-only. Creates a new user (email pre-confirmed) and promotes them to admin.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if ((me as any)?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { email, password, fullName } = await req.json() as { email?: string; password?: string; fullName?: string }
    const cleanEmail = (email ?? '').trim().toLowerCase()
    if (!cleanEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    const admin = createServiceRoleClient()
    const { data: created, error: createErr } = await (admin as any).auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: (fullName ?? '').trim() || null },
    })

    if (createErr || !created?.user) {
      const msg = String(createErr?.message ?? '')
      const friendly = /already|registered|exists/i.test(msg)
        ? 'A user with this email already exists.'
        : 'Could not create the admin. Please try again.'
      console.error('[admin/create-admin] createUser failed:', createErr)
      return NextResponse.json({ error: friendly }, { status: 400 })
    }

    // The handle_new_user trigger creates the profile as a student; promote to admin.
    // Service-role writes bypass the privilege-escalation guard (043).
    const { error: roleErr } = await (admin as any)
      .from('profiles')
      .upsert({ id: created.user.id, full_name: (fullName ?? '').trim() || null, role: 'admin' }, { onConflict: 'id' })

    if (roleErr) {
      console.error('[admin/create-admin] promote failed:', roleErr)
      return NextResponse.json({ error: 'Admin account was created but could not be granted admin role. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/create-admin]', err)
    return NextResponse.json({ error: 'Could not create the admin. Please try again.' }, { status: 500 })
  }
}

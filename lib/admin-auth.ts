import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

// Shared admin gate for API routes. Verifies an authenticated admin and hands back both
// the request-scoped client and a service-role client for privileged writes.
// Usage:
//   const auth = await requireAdmin()
//   if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
//   const { admin, user } = auth
export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorised', status: 401 as const }

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((me as any)?.role !== 'admin') return { error: 'Forbidden', status: 403 as const }

  return { user, supabase, admin: createServiceRoleClient() }
}

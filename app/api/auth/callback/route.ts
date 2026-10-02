import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Google sign-in has no form-submit moment to fire sign_up/login from (it's a full-page
      // redirect through here), so detect first-ever session server-side and hand it to the
      // browser via a one-time query param — AuthEventTracker fires the right event and
      // strips it. created_at/last_sign_in_at are essentially equal only on the very first
      // session; any later login moves last_sign_in_at forward. Gated to the Google provider
      // only: this same route also runs when an EMAIL signup's confirmation link is clicked,
      // and that account's sign_up already fired at form-submit time (register-form.tsx) —
      // firing it again here would double-count it.
      let authEvent: 'signup' | 'login' | null = null
      // Ensure the profile carries the name/grade captured at signup. The DB trigger
      // should do this, but we backfill here (service role) so it's reliable regardless.
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user && user.app_metadata?.provider === 'google') {
          const createdAt = new Date(user.created_at).getTime()
          const lastSignInAt = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : createdAt
          authEvent = Math.abs(lastSignInAt - createdAt) < 10_000 ? 'signup' : 'login'
        }
        const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string; grade_id?: string; age_confirmed_at?: string }
        // Google returns `name` (and sometimes `full_name`); email signup sends full_name/grade_id.
        const metaName = meta.full_name ?? meta.name
        if (user) {
          const admin = createServiceRoleClient()
          if (metaName || meta.grade_id || meta.age_confirmed_at) {
            const { data: existing } = await (admin as any)
              .from('profiles').select('full_name, grade_id, age_confirmed_at').eq('id', user.id).maybeSingle()

            const patch: Record<string, unknown> = {}
            if (!existing?.full_name && metaName) patch.full_name = metaName
            if (!existing?.grade_id && meta.grade_id) patch.grade_id = meta.grade_id
            if (!existing?.age_confirmed_at && meta.age_confirmed_at) patch.age_confirmed_at = meta.age_confirmed_at

            if (Object.keys(patch).length > 0) {
              await (admin as any).from('profiles').upsert({ id: user.id, ...patch }, { onConflict: 'id' })
            }
          }

          // Capture the student's country/region from Vercel's geo headers, once — set only
          // when not already recorded so a later sign-in from elsewhere never overwrites it.
          const country = request.headers.get('x-vercel-ip-country')
          const region = request.headers.get('x-vercel-ip-country-region')
          if (country) {
            await (admin as any)
              .from('profiles')
              .update({ signup_country: country, signup_region: region ?? null })
              .eq('id', user.id)
              .is('signup_country', null)
          }
        }
      } catch (e) {
        console.error('[auth/callback] profile backfill failed:', e)
      }

      if (authEvent) {
        const { data: { user } } = await supabase.auth.getUser()
        // No personal data in the URL (see docs/TRACKING.md rules) — AuthEventTracker fetches
        // email itself client-side from the now-established session before firing the event.
        const url = new URL(`${origin}${next}`)
        url.searchParams.set('authEvent', authEvent)
        if (user) url.searchParams.set('uid', user.id)
        return NextResponse.redirect(url.toString())
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}

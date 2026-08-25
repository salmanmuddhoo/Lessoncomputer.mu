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
      // Ensure the profile carries the name/grade captured at signup. The DB trigger
      // should do this, but we backfill here (service role) so it's reliable regardless.
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string; grade_id?: string }
        // Google returns `name` (and sometimes `full_name`); email signup sends full_name/grade_id.
        const metaName = meta.full_name ?? meta.name
        if (user) {
          const admin = createServiceRoleClient()
          if (metaName || meta.grade_id) {
            const { data: existing } = await (admin as any)
              .from('profiles').select('full_name, grade_id').eq('id', user.id).maybeSingle()

            const patch: Record<string, unknown> = {}
            if (!existing?.full_name && metaName) patch.full_name = metaName
            if (!existing?.grade_id && meta.grade_id) patch.grade_id = meta.grade_id

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
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}

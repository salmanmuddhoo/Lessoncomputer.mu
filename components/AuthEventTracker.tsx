'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { track } from '@/lib/track'

// Google sign-in/sign-up is a full-page redirect through /api/auth/callback, so there's no
// click/submit moment in the browser to fire sign_up/login from directly. The callback route
// appends a one-time ?authEvent=signup|login&uid=<id> (no email/PII in the URL, per
// docs/TRACKING.md) — this reads it, fetches the now-signed-in user's email client-side, fires
// the right event once, and strips the params so a refresh never re-fires it.
function Inner() {
  const params = useSearchParams()
  useEffect(() => {
    const authEvent = params.get('authEvent')
    const uid = params.get('uid')
    if (!authEvent || !uid) return

    async function fire() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (authEvent === 'signup') {
        track('sign_up', { method: 'google', user_id: uid, user_data: { email: user?.email ?? undefined } })
      } else if (authEvent === 'login') {
        track('login', { method: 'google', user_id: uid })
      }
      const url = new URL(window.location.href)
      url.searchParams.delete('authEvent')
      url.searchParams.delete('uid')
      window.history.replaceState(null, '', url.pathname + url.search)
    }
    fire()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])
  return null
}

export default function AuthEventTracker() {
  return <Suspense fallback={null}><Inner /></Suspense>
}

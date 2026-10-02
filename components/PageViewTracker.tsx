'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { track } from '@/lib/track'
import { CONSENT_CHANGE_EVENT } from '@/lib/consent'

// Next.js changes pages without a full reload, so page views must be pushed on every route
// change. GA4 "history change" page views are switched off in the new property — this is the
// only source of page_view events (no doubles).
function Inner() {
  const pathname = usePathname()
  const search = useSearchParams()
  // Re-fire for the current page when consent is given mid-visit (track() was a no-op before).
  const [consentTick, setConsentTick] = useState(0)
  useEffect(() => {
    const onChange = () => setConsentTick((n) => n + 1)
    window.addEventListener(CONSENT_CHANGE_EVENT, onChange)
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onChange)
  }, [])
  useEffect(() => {
    track('page_view', {
      page_location: window.location.href,
      page_path: pathname,
      page_title: document.title,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search, consentTick])
  return null
}

export default function PageViewTracker() {
  return <Suspense fallback={null}><Inner /></Suspense>
}

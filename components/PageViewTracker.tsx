'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import { track } from '@/lib/track'

// Next.js changes pages without a full reload, so page views must be pushed on every route
// change. GA4 "history change" page views are switched off in the new property — this is the
// only source of page_view events (no doubles).
function Inner() {
  const pathname = usePathname()
  const search = useSearchParams()
  useEffect(() => {
    track('page_view', {
      page_location: window.location.href,
      page_path: pathname,
      page_title: document.title,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search])
  return null
}

export default function PageViewTracker() {
  return <Suspense fallback={null}><Inner /></Suspense>
}

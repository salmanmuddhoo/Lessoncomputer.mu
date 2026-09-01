'use client'

import { useEffect, useState } from 'react'

interface Props {
  iso: string
}

// Renders the payment date/time in the viewer's own machine timezone (not a fixed one),
// so a receipt always reads correctly no matter where the student opens it. SSR and the
// first client render use UTC (deterministic, avoids a hydration mismatch); once mounted
// we switch to the browser's real local timezone.
export function ReceiptDate({ iso }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const date = new Date(iso)
  const tz = mounted ? undefined : 'UTC' // undefined => the viewer's local timezone

  const formattedDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', ...(tz ? { timeZone: tz } : {}) }).format(date)
  const formattedTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', ...(tz ? { timeZone: tz } : {}) }).format(date)

  return (
    <>
      <p className="font-medium">{formattedDate}</p>
      <p className="text-xs text-muted-foreground">{formattedTime}</p>
    </>
  )
}

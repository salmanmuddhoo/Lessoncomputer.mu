'use client'

import { useEffect, useState } from 'react'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MU_TZ = 'Indian/Mauritius'

interface Props {
  scheduledAt: string
  isRecurring: boolean
  recurrenceDayOfWeek: number | null
  endTime: string | null
}

function fmtTime(d: Date, tz?: string) {
  return new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', ...(tz ? { timeZone: tz } : {}) }).format(d)
}
function fmtDate(d: Date, tz?: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', ...(tz ? { timeZone: tz } : {}) }).format(d)
}

// end_time is a bare Mauritius time-of-day (HH:MM). Anchor it to the class's Mauritius
// calendar day and return the real instant, so it converts to the viewer's tz correctly.
// (Mauritius is a fixed UTC+4, no DST.)
function endInstant(scheduledAt: string, endTime: string): Date {
  const muStart = new Date(new Date(scheduledAt).getTime() + 4 * 3600 * 1000) // read UTC parts = Mauritius wall time
  const [eh, em] = endTime.split(':').map(Number)
  const muEndWall = Date.UTC(muStart.getUTCFullYear(), muStart.getUTCMonth(), muStart.getUTCDate(), eh, em)
  return new Date(muEndWall - 4 * 3600 * 1000)
}

export function LiveClassSchedule({ scheduledAt, isRecurring, recurrenceDayOfWeek, endTime }: Props) {
  // SSR & first client render use Mauritius time (deterministic — avoids a hydration
  // mismatch). After mount we switch to the student's local timezone and add a Mauritius
  // reference so a student anywhere in the world knows exactly when the class is.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const displayTz = mounted ? undefined : MU_TZ // undefined => the viewer's local timezone

  const start = new Date(scheduledAt)
  const end = endTime ? endInstant(scheduledAt, endTime) : null

  const startStr = fmtTime(start, displayTz)
  const endStr = end ? fmtTime(end, displayTz) : null

  if (isRecurring && recurrenceDayOfWeek != null) {
    let text = `Every ${DAYS[recurrenceDayOfWeek]} from ${startStr}`
    if (endStr) text += ` to ${endStr}`
    return <>{text}</>
  }

  let text = `${fmtDate(start, displayTz)} · ${startStr}`
  if (endStr) text += ` – ${endStr}`
  return <>{text}</>
}

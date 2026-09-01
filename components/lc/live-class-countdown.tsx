'use client'

import { useEffect, useState } from 'react'

const MU_TZ = 'Indian/Mauritius'
const MU_OFFSET_MS = 4 * 3600 * 1000 // Mauritius is a fixed UTC+4, no DST

interface Props {
  scheduledAt: string
  isRecurring: boolean
  recurrenceDayOfWeek: number | null
  endTime: string | null
}

// Mauritius wall-clock hour/minute embedded in an ISO instant.
function muWallTime(iso: string): { hours: number; minutes: number } {
  const d = new Date(new Date(iso).getTime() + MU_OFFSET_MS)
  return { hours: d.getUTCHours(), minutes: d.getUTCMinutes() }
}

// The real instant (UTC) of the next occurrence of this class. For a one-off class that's
// just scheduled_at; for a recurring class it's the next Mauritius calendar day matching
// recurrence_day_of_week at the class's Mauritius wall-clock start time.
function nextOccurrence(scheduledAt: string, isRecurring: boolean, recurrenceDayOfWeek: number | null): Date {
  const scheduled = new Date(scheduledAt)
  if (!isRecurring || recurrenceDayOfWeek === null) return scheduled

  const { hours, minutes } = muWallTime(scheduledAt)
  const nowMu = new Date(Date.now() + MU_OFFSET_MS) // read UTC parts = Mauritius wall time "now"
  const todayMuMidnightMs = Date.UTC(nowMu.getUTCFullYear(), nowMu.getUTCMonth(), nowMu.getUTCDate())
  const daysUntil = (recurrenceDayOfWeek - nowMu.getUTCDay() + 7) % 7

  let occurrenceMuWallMs = todayMuMidnightMs + daysUntil * 86_400_000 + hours * 3_600_000 + minutes * 60_000
  let occurrence = new Date(occurrenceMuWallMs - MU_OFFSET_MS)
  if (occurrence.getTime() <= Date.now()) {
    occurrenceMuWallMs += 7 * 86_400_000
    occurrence = new Date(occurrenceMuWallMs - MU_OFFSET_MS)
  }
  return occurrence
}

// end_time is a bare Mauritius time-of-day (HH:MM) — anchor it to the occurrence's Mauritius
// calendar day.
function occurrenceEnd(occurrence: Date, endTime: string): Date {
  const muStart = new Date(occurrence.getTime() + MU_OFFSET_MS)
  const [eh, em] = endTime.split(':').map(Number)
  const muEndWall = Date.UTC(muStart.getUTCFullYear(), muStart.getUTCMonth(), muStart.getUTCDate(), eh, em)
  return new Date(muEndWall - MU_OFFSET_MS)
}

function fmtWeekday(d: Date) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: MU_TZ }).format(d)
}
function fmtDate(d: Date) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: MU_TZ }).format(d)
}
function fmtTime(d: Date) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: MU_TZ }).format(d)
}

function fmtCountdown(msLeft: number): string {
  const days = Math.floor(msLeft / 86_400_000)
  const hours = Math.floor((msLeft % 86_400_000) / 3_600_000)
  const minutes = Math.max(0, Math.ceil((msLeft % 3_600_000) / 60_000))
  const parts: string[] = []
  if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`)
  if (hours > 0) parts.push(`${hours} hr${hours === 1 ? '' : 's'}`)
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} min${minutes === 1 ? '' : 's'}`)
  return `starts in ${parts.join(' ')}`
}

export function LiveClassCountdown({ scheduledAt, isRecurring, recurrenceDayOfWeek, endTime }: Props) {
  const [now, setNow] = useState<number | null>(null)

  // Tick every 30s once mounted so the countdown stays live.
  useEffect(() => {
    setNow(Date.now())
    const interval = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(interval)
  }, [])

  const occurrence = nextOccurrence(scheduledAt, isRecurring, recurrenceDayOfWeek)
  const end = endTime ? occurrenceEnd(occurrence, endTime) : null

  const scheduleStr = `${fmtWeekday(occurrence)} ${fmtDate(occurrence)}, ${fmtTime(occurrence)}${end ? `–${fmtTime(end)}` : ''} (Mauritius time)`

  // Skip the live countdown suffix until mounted (it depends on the viewer's clock).
  if (now === null) return <>{scheduleStr}</>

  const msUntilStart = occurrence.getTime() - now
  let statusStr: string
  if (msUntilStart > 0) {
    statusStr = fmtCountdown(msUntilStart)
  } else if (end && now <= end.getTime()) {
    statusStr = 'live now'
  } else if (!isRecurring) {
    statusStr = 'ended'
  } else {
    statusStr = fmtCountdown(0)
  }

  return <>{scheduleStr} · {statusStr}</>
}

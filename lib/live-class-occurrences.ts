// Live classes store month/year + time-of-day in `scheduled_at` (pinned to day 1),
// and recurring ones repeat weekly on `recurrence_day_of_week` (0=Sun … 6=Sat).
// These helpers expand a class into real calendar occurrences.

export interface OccurrenceClass {
  is_recurring?: boolean | null
  recurrence_day_of_week?: number | null
  scheduled_at: string
  end_time?: string | null
}

// A live class belongs to the month/year encoded in scheduled_at; recurring classes
// repeat weekly ONLY within that month (e.g. a January class must not appear in August).
function classInfo(scheduledAt: string) {
  const d = new Date(scheduledAt)
  return { year: d.getFullYear(), month: d.getMonth(), h: d.getHours(), m: d.getMinutes() }
}

// All start-times for `cls` that fall within [start, end] (inclusive).
export function occurrencesInRange(cls: OccurrenceClass, start: Date, end: Date): Date[] {
  const { year, month, h, m } = classInfo(cls.scheduled_at)
  const out: Date[] = []

  if (cls.is_recurring && cls.recurrence_day_of_week != null) {
    // Clamp the scan to the intersection of [start, end] and the class's own month.
    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59)
    const lo = start > monthStart ? start : monthStart
    const hi = end < monthEnd ? end : monthEnd
    const cursor = new Date(lo.getFullYear(), lo.getMonth(), lo.getDate())
    while (cursor <= hi) {
      if (cursor.getDay() === cls.recurrence_day_of_week) {
        out.push(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), h, m))
      }
      cursor.setDate(cursor.getDate() + 1)
    }
  } else {
    const s = new Date(cls.scheduled_at)
    if (s >= start && s <= end) out.push(s)
  }
  return out
}

// The soonest occurrence start-time at or after `from`, or null if none upcoming.
export function nextOccurrence(cls: OccurrenceClass, from: Date): Date | null {
  const { year, month, h, m } = classInfo(cls.scheduled_at)

  if (cls.is_recurring && cls.recurrence_day_of_week != null) {
    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59)
    if (monthEnd < from) return null // the class's month has already passed
    const lo = from > monthStart ? from : monthStart
    // Scan within the class's month for the first matching weekday at/after `from`.
    for (let i = 0; i <= 31; i++) {
      const d = new Date(lo.getFullYear(), lo.getMonth(), lo.getDate() + i, h, m)
      if (d > monthEnd) return null
      if (d.getDay() === cls.recurrence_day_of_week && d >= from) return d
    }
    return null
  }

  const s = new Date(cls.scheduled_at)
  return s >= from ? s : null
}

// Combine a start Date with the class's end_time (HH:MM[:SS]) into an end Date.
export function endForOccurrence(cls: OccurrenceClass, start: Date): Date | null {
  if (!cls.end_time) return null
  const [h, m] = cls.end_time.split(':').map(Number)
  return new Date(start.getFullYear(), start.getMonth(), start.getDate(), h || 0, m || 0)
}

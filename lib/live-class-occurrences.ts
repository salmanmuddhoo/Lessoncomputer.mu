// Live classes store month/year + time-of-day in `scheduled_at` (pinned to day 1),
// and recurring ones repeat weekly on `recurrence_day_of_week` (0=Sun … 6=Sat).
// These helpers expand a class into real calendar occurrences.

export interface OccurrenceClass {
  is_recurring?: boolean | null
  recurrence_day_of_week?: number | null
  scheduled_at: string
  end_time?: string | null
}

function timeOfDay(scheduledAt: string): { h: number; m: number } {
  const d = new Date(scheduledAt)
  return { h: d.getHours(), m: d.getMinutes() }
}

// All start-times for `cls` that fall within [start, end] (inclusive).
export function occurrencesInRange(cls: OccurrenceClass, start: Date, end: Date): Date[] {
  const { h, m } = timeOfDay(cls.scheduled_at)
  const out: Date[] = []

  if (cls.is_recurring && cls.recurrence_day_of_week != null) {
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    while (cursor <= end) {
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
  const { h, m } = timeOfDay(cls.scheduled_at)

  if (cls.is_recurring && cls.recurrence_day_of_week != null) {
    // Scan the next two weeks for the matching weekday at/after `from`.
    for (let i = 0; i < 14; i++) {
      const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i, h, m)
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

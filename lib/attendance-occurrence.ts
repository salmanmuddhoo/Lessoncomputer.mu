// A recurring live class is one `live_classes` row that happens every week — attendance is
// tracked per real occurrence (one record per week), keyed by a Mauritius-local calendar date
// (Mauritius is a fixed UTC+4, no DST). Shared by every place that marks or lists attendance so
// the "which week is this" logic stays identical everywhere.

const MU_OFFSET_MS = 4 * 3600 * 1000

// Mauritius-local calendar date (YYYY-MM-DD) of the given instant (defaults to now).
export function muDateString(d: Date = new Date()): string {
  return new Date(d.getTime() + MU_OFFSET_MS).toISOString().slice(0, 10)
}

// The occurrence date (Mauritius) of "this class's session" relative to referenceDate (defaults
// to now): for a recurring class, the most recent date on/before referenceDate that matches the
// recurrence weekday; for a one-off class, just its own scheduled date.
export function currentOccurrenceDate(
  scheduledAt: string,
  isRecurring: boolean,
  recurrenceDayOfWeek: number | null,
  referenceDate: Date = new Date()
): string {
  if (!isRecurring || recurrenceDayOfWeek == null) {
    return muDateString(new Date(scheduledAt))
  }
  const refMu = new Date(referenceDate.getTime() + MU_OFFSET_MS)
  const daysSince = (refMu.getUTCDay() - recurrenceDayOfWeek + 7) % 7
  const occ = new Date(refMu.getTime() - daysSince * 86_400_000)
  return occ.toISOString().slice(0, 10)
}

// Every occurrence date (Mauritius) a recurring class has had, from its own anchor date up to
// (and including) `untilDateStr` (defaults to today) — a session that hasn't happened yet has
// no attendance to show. A one-off class always returns just its own scheduled date, whether
// past or future, so it still appears on an admin's schedule ahead of time.
export function occurrencesUpTo(
  scheduledAt: string,
  isRecurring: boolean,
  recurrenceDayOfWeek: number | null,
  untilDateStr: string = muDateString()
): string[] {
  const anchorMuStr = muDateString(new Date(scheduledAt))
  if (!isRecurring || recurrenceDayOfWeek == null) {
    return [anchorMuStr]
  }
  const out: string[] = []
  let day = new Date(`${anchorMuStr}T00:00:00Z`)
  while (day.getUTCDay() !== recurrenceDayOfWeek) day = new Date(day.getTime() + 86_400_000)
  const until = new Date(`${untilDateStr}T00:00:00Z`)
  while (day <= until) {
    out.push(day.toISOString().slice(0, 10))
    day = new Date(day.getTime() + 7 * 86_400_000)
  }
  return out
}

// Every occurrence date of a class that falls within calendar month `year`-`month` (1-12).
// Recurring weeks are capped at today (nothing to show for a week that hasn't happened); a
// one-off class in that month shows regardless of past/future.
export function occurrencesInMonth(
  scheduledAt: string,
  isRecurring: boolean,
  recurrenceDayOfWeek: number | null,
  year: number,
  month: number
): string[] {
  const monthEndStr = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
  const cap = monthEndStr < muDateString() ? monthEndStr : muDateString()
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`
  if (!isRecurring || recurrenceDayOfWeek == null) {
    return occurrencesUpTo(scheduledAt, isRecurring, recurrenceDayOfWeek).filter((d) => d.startsWith(monthPrefix))
  }
  return occurrencesUpTo(scheduledAt, isRecurring, recurrenceDayOfWeek, cap).filter((d) => d.startsWith(monthPrefix))
}

// Human-friendly weekday + date, e.g. "Monday, 8 September 2026".
export function formatOccurrenceDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

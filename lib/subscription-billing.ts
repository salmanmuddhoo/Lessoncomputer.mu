export interface BillingSettings {
  billingDay: number
  cutoffDay: number
  billingHour: number
}

export interface TargetMonth {
  month: number       // 1–12
  year: number
  validFrom: string   // ISO date: first day of month
  validUntil: string  // ISO date: last day of month
  isCurrentMonth: boolean
}

// Fetch billing_day and cutoff_day from site_settings row 1
export async function getBillingSettings(supabase: any): Promise<BillingSettings> {
  const { data } = await supabase
    .from('site_settings')
    .select('billing_day, cutoff_day, billing_hour')
    .eq('id', 1)
    .single()
  return {
    billingDay:  data?.billing_day  ?? 28,
    cutoffDay:   data?.cutoff_day   ?? 20,
    billingHour: data?.billing_hour ?? 6,
  }
}

// Return the subscription month a student should buy based on today and the cutoff day.
// On or before cutoff → current month (immediate access).
// After cutoff → next month (access starts 1st of next month).
export function getTargetMonth(today: Date, cutoffDay: number): TargetMonth {
  const day = today.getDate()

  let month: number
  let year: number

  if (day <= cutoffDay) {
    month = today.getMonth() + 1
    year  = today.getFullYear()
  } else {
    const next = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    month = next.getMonth() + 1
    year  = next.getFullYear()
  }

  const validFrom  = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay    = new Date(year, month, 0).getDate()
  const validUntil = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  return {
    month,
    year,
    validFrom,
    validUntil,
    isCurrentMonth: month === today.getMonth() + 1 && year === today.getFullYear(),
  }
}

// Given a live package's month and year, return its valid_from and valid_until ISO dates.
export function getMonthDateRange(month: number, year: number): { validFrom: string; validUntil: string } {
  const validFrom  = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay    = new Date(year, month, 0).getDate()
  const validUntil = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { validFrom, validUntil }
}

// Today as ISO date string (YYYY-MM-DD)
export function todayISO(): string {
  return new Date().toISOString().split('T')[0]!
}

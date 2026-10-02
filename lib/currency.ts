import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_CURRENCY, type CurrencyInfo } from '@/lib/currency-format'

// Decide which currency to DISPLAY to the current visitor:
//  - Mauritius (or unknown location) → MUR.
//  - Anywhere else → USD, IF an exchange rate is configured (site_settings.usd_rate).
// Never affects what is charged — MIPS always settles in MUR.
export async function getCurrencyInfo(): Promise<CurrencyInfo> {
  let country = ''
  try {
    const h = await headers()
    country = (h.get('x-vercel-ip-country') || h.get('x-country') || '').toUpperCase()
  } catch { /* headers unavailable */ }

  // No geo (local/dev) or Mauritius → Rupees.
  if (!country || country === 'MU') return DEFAULT_CURRENCY

  try {
    const supabase = await createClient()
    const { data } = await (supabase as any)
      .from('site_settings').select('usd_rate').eq('id', 1).single()
    const rate = Number(data?.usd_rate ?? 0)
    if (rate > 0) return { currency: 'USD', rate, international: true }
  } catch { /* fall through */ }

  return { ...DEFAULT_CURRENCY, international: true } // rate not configured → keep MUR
}

// Server-side check for checkout: is this buyer outside Mauritius? Unknown location (local/dev)
// is treated as domestic, matching the currency shown.
export async function isInternationalBuyer(): Promise<boolean> {
  try {
    const h = await headers()
    const country = (h.get('x-vercel-ip-country') || h.get('x-country') || '').toUpperCase()
    return !!country && country !== 'MU'
  } catch {
    return false
  }
}

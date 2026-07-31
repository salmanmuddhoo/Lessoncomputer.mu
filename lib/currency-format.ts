// Pure currency formatting shared by server and client (no server-only imports).

export type CurrencyInfo = { currency: 'MUR' | 'USD'; rate: number }

export const DEFAULT_CURRENCY: CurrencyInfo = { currency: 'MUR', rate: 1 }

// Amounts are stored in MUR everywhere. When the viewer is shown USD, convert with the
// admin-set rate (MUR per 1 USD). Payment is always charged in MUR regardless.
export function formatMoney(mur: number, info: CurrencyInfo = DEFAULT_CURRENCY): string {
  const n = Number(mur) || 0
  if (info.currency === 'USD' && info.rate > 0) {
    // USD is shown rounded to the nearest whole dollar (e.g. 14.13 → $14, 11.96 → $12).
    const usd = Math.round(n / info.rate)
    return `$${usd.toLocaleString('en-US')}`
  }
  return `Rs ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

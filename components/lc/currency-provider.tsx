'use client'

import { createContext, useContext } from 'react'
import { DEFAULT_CURRENCY, formatMoney, type CurrencyInfo } from '@/lib/currency-format'

const CurrencyContext = createContext<CurrencyInfo>(DEFAULT_CURRENCY)

// Seeded once per layout from the server-resolved currency, so client price components
// can format consistently.
export function CurrencyProvider({ value, children }: { value: CurrencyInfo; children: React.ReactNode }) {
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency(): CurrencyInfo {
  return useContext(CurrencyContext)
}

// Convenience: format a MUR amount in the viewer's display currency.
export function usePrice(): (mur: number) => string {
  const info = useCurrency()
  return (mur: number) => formatMoney(mur, info)
}

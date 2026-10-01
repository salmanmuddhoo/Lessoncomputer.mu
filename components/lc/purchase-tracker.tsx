'use client'

import { useEffect } from 'react'
import { track, cart, type Product } from '@/lib/track'

interface Props {
  orderId: string
  userId: string
  email: string | null
  fullName: string | null
  items: Product[]
}

// Fires the client-side `purchase` event once per order. The server-side Meta Purchase
// (lib/meta-capi.ts, fired from the MIPS confirmation) is the authoritative one — this is the
// browser-side half of the pair, sharing the same event_id so Meta de-duplicates them. Guarded
// by localStorage so a page refresh (or returning to this URL later) never counts a second sale.
export function PurchaseTracker({ orderId, userId, email, fullName, items }: Props) {
  useEffect(() => {
    const key = `purchase_sent_${orderId}`
    if (typeof window === 'undefined' || localStorage.getItem(key)) return
    const [firstName, ...rest] = (fullName ?? '').split(' ').filter(Boolean)
    track('purchase', {
      event_id: `purchase_${orderId}`,
      user_id: userId,
      user_data: {
        email: email ?? undefined,
        first_name: firstName || undefined,
        last_name: rest.join(' ') || undefined,
      },
      ...cart(items, { transaction_id: orderId }),
    })
    localStorage.setItem(key, '1')
  }, [orderId, userId, email, fullName, items])

  return null
}

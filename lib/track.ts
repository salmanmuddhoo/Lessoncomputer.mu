// Single entry point for every GTM dataLayer push, per docs/TRACKING.md — keeps event
// names/shapes from drifting across call sites and clears the previous `ecommerce` object,
// which GA4 requires before pushing a new one.

import { isTrackingAllowed } from '@/lib/consent'

type UserData = { email?: string; phone?: string; first_name?: string; last_name?: string }

export function track(event: string, data: Record<string, unknown> = {}) {
  // No consent (or a student-area page for an account not known to be an adult) → nothing is
  // pushed at all, so nothing can be replayed to GTM if it loads later.
  if (!isTrackingAllowed()) return
  const w = window as any
  w.dataLayer = w.dataLayer || []
  if ('ecommerce' in data) w.dataLayer.push({ ecommerce: null })
  w.dataLayer.push({ event, event_id: crypto.randomUUID(), ...data })
}

export type { UserData }

export type Product = {
  item_id: string        // live class id, video package id (e.g. the pkg= uuid) or lesson id
  item_name: string      // e.g. 'G7 October 2026' or 'Grade 9 Video Package 1'
  item_category: 'live_class' | 'video_package' | 'video_lesson'
  item_category2: string // grade slug, e.g. 'grade-9'
  price: number          // MUR, e.g. 650
  quantity: 1
}

export const cart = (items: Product[], extra: Record<string, unknown> = {}) => ({
  ecommerce: { currency: 'MUR', value: items.reduce((s, i) => s + i.price, 0), items, ...extra },
})

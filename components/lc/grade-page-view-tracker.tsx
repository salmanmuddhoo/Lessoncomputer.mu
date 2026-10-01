'use client'

import { useEffect } from 'react'
import { track, cart, type Product } from '@/lib/track'

// Fires view_item once when a grade page mounts, with every paid product shown on it.
export function GradePageViewTracker({ grade, products }: { grade: string; products: Product[] }) {
  useEffect(() => {
    if (products.length === 0) return
    track('view_item', { grade, ...cart(products) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade])
  return null
}

'use client'

import Link from 'next/link'
import { track, cart, type Product } from '@/lib/track'

// Guests clicking Subscribe/Buy are sent straight to /login (no dialog to attach an onClick
// to in a server component) — this fires add_to_cart synchronously before the navigation
// away, matching the same tracking a logged-in user gets by opening BuySubscribeDialog.
export function TrackedBuyLink({
  href, product, grade, children, className,
}: {
  href: string
  product: Product
  grade: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => track('add_to_cart', { grade, ...cart([product]) })}
    >
      {children}
    </Link>
  )
}

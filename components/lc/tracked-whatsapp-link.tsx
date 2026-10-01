'use client'

import { track } from '@/lib/track'

// The contact page's inline WhatsApp link lives in a server component, so it can't attach
// its own onClick — this wraps it the same way TrackedBuyLink wraps guest Subscribe/Buy links.
export function TrackedWhatsAppLink({
  href, className, children,
}: {
  href: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => track('whatsapp_click')}
    >
      {children}
    </a>
  )
}

'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  orderId: string
  intervalMs?: number
}

export function PaymentPendingPoller({ orderId, intervalMs = 4000 }: Props) {
  const router = useRouter()
  const activeRef = useRef(true)

  useEffect(() => {
    activeRef.current = true

    const check = async () => {
      if (!activeRef.current) return
      try {
        const res = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        })
        const data = await res.json()
        if (data.status === 'paid') {
          router.refresh()
          return
        }
      } catch {
        // network error — fall through to retry
      }
      if (activeRef.current) {
        router.refresh()
      }
    }

    const id = setInterval(check, intervalMs)
    return () => {
      activeRef.current = false
      clearInterval(id)
    }
  }, [orderId, intervalMs, router])

  return null
}

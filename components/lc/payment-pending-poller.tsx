'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  orderId: string
  intervalMs?: number
}

export function PaymentPendingPoller({ orderId, intervalMs = 4000 }: Props) {
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh()
    }, intervalMs)
    return () => clearInterval(id)
  }, [orderId, intervalMs, router])

  return null
}

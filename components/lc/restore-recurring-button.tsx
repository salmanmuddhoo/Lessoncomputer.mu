'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

// Student already paid for this month (row exists, status='active') but previously
// cancelled auto-renewal (is_recurring=false) — reactivates billing without charging again.
export function RestoreRecurringButton({ subscriptionId }: { subscriptionId: string }) {
  const router = useRouter()
  const [restoring, setRestoring] = useState(false)

  async function handleRestore() {
    setRestoring(true)
    try {
      const res = await fetch('/api/payment/restore-recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to restore recurring billing.')
        return
      }
      toast.success('Recurring billing restored. You will be charged automatically next month.')
      router.refresh()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setRestoring(false)
    }
  }

  return (
    <Button
      size="sm"
      onClick={handleRestore}
      disabled={restoring}
      className="gap-1.5"
    >
      <RotateCcw className="w-4 h-4" />
      {restoring ? 'Restoring…' : 'Restore recurring'}
    </Button>
  )
}

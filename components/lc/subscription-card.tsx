'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, Radio, RefreshCw, XCircle, Receipt } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

interface SubscriptionCardProps {
  id: string
  packageId: string | null
  subscriptionType: string
  isRecurring: boolean
  purchasedAt: string
  orderId: string | null
  pkg: {
    name: string
    month: number | null
    year: number | null
    price: number
  } | null
}

export function SubscriptionCard({ id, subscriptionType, isRecurring, purchasedAt, pkg, orderId }: SubscriptionCardProps) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const isLive = subscriptionType === 'live' || (pkg?.month != null && pkg?.year != null)
  const monthLabel = pkg?.month && pkg?.year ? `${MONTHS[pkg.month - 1]} ${pkg.year}` : null

  async function handleCancelRecurring() {
    setCancelling(true)
    try {
      const res = await fetch('/api/payment/cancel-recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: id }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to cancel recurring subscription.')
        return
      }
      toast.success('Recurring billing cancelled. Your access remains until the end of the current period.')
      setConfirmOpen(false)
      router.refresh()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card transition-colors">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          isLive ? 'bg-primary/10' : 'bg-muted'
        }`}>
          {isLive
            ? <Radio className="w-5 h-5 text-primary" />
            : <Package className="w-5 h-5 text-muted-foreground" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="font-semibold text-sm truncate">{pkg?.name ?? 'Package'}</span>
            <Badge
              variant="outline"
              className={`text-xs shrink-0 ${isLive ? 'text-primary border-primary/30 bg-primary/5' : ''}`}
            >
              {isLive ? 'Live Classes' : 'Video Package'}
            </Badge>
            {isLive && isRecurring && (
              <Badge variant="outline" className="text-xs shrink-0 text-green-600 border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400 gap-1">
                <RefreshCw className="w-2.5 h-2.5" />
                Recurring
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {monthLabel && <span>{monthLabel}</span>}
            <span>Purchased {new Date(purchasedAt).toLocaleDateString('en-MU', { dateStyle: 'medium' })}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isLive && isRecurring && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel recurring
            </Button>
          )}
          {orderId && (
            <Link
              href={`/dashboard/subscriptions/receipt/${orderId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/60 hover:bg-muted/30 transition-colors"
            >
              <Receipt className="w-3.5 h-3.5" />
              Receipt
            </Link>
          )}
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm" aria-describedby="cancel-recurring-desc">
          <DialogHeader>
            <DialogTitle>Cancel recurring billing?</DialogTitle>
            <DialogDescription id="cancel-recurring-desc">
              Your access to live classes will continue until the end of the current month.
              You will <strong>not</strong> be charged next month and can re-subscribe any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={cancelling}>
              Keep subscription
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelRecurring}
              disabled={cancelling}
            >
              {cancelling ? 'Cancelling…' : 'Yes, cancel recurring'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

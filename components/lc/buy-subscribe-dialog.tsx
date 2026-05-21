'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShoppingCart, Radio, Lock, RefreshCw, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

interface VideoPackageItem {
  id: string
  name: string
  price: number
  chapterCount: number
}

interface LivePackageItem {
  id: string
  name: string
  month: number
  year: number
}

interface Props {
  videoPackages: VideoPackageItem[]
  mandatoryPackageId?: string
  subscribedPackageIds?: string[]
  subscribedLivePackageIds?: string[]
  gradeName: string
  liveSubscriptionPrice: number
  liveSubscriptionEnabled: boolean
  liveMonthPackageId?: string
  liveMonthLabel?: string
  pastLivePackages?: LivePackageItem[]
  defaultMode?: 'video' | 'live'
  triggerLabel?: string
  triggerSize?: 'sm' | 'default'
  isLoggedIn?: boolean
}

export function BuySubscribeDialog({
  videoPackages,
  mandatoryPackageId,
  subscribedPackageIds = [],
  subscribedLivePackageIds = [],
  gradeName,
  liveSubscriptionPrice,
  liveSubscriptionEnabled,
  liveMonthPackageId,
  liveMonthLabel,
  pastLivePackages = [],
  defaultMode = 'video',
  triggerLabel,
  triggerSize = 'default',
  isLoggedIn,
}: Props) {
  const subscribedSet = new Set(subscribedPackageIds)
  const subscribedLiveSet = new Set(subscribedLivePackageIds)
  const isCurrentMonthSubscribed = !!(liveMonthPackageId && subscribedLiveSet.has(liveMonthPackageId))

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'video' | 'live'>(defaultMode)
  const [isRecurring, setIsRecurring] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(mandatoryPackageId ? [mandatoryPackageId] : [])
  )
  const [selectedPastLive, setSelectedPastLive] = useState<Set<string>>(new Set())
  const [paying, setPaying] = useState(false)
  // Defer price rendering to client to avoid SSR/hydration mismatch on computed prices
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  function handleOpen() {
    setMode(defaultMode)
    setSelected(new Set(mandatoryPackageId ? [mandatoryPackageId] : []))
    setSelectedPastLive(new Set())
    setOpen(true)
  }

  function toggle(id: string) {
    if (id === mandatoryPackageId) return
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function togglePastLive(id: string) {
    setSelectedPastLive((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectedPackages = videoPackages.filter((p) => selected.has(p.id))
  const total = selectedPackages.reduce((sum, p) => sum + p.price, 0)

  const unsubscribedPastPackages = pastLivePackages.filter((p) => !subscribedLiveSet.has(p.id))

  // Total live months to purchase = current month + any selected past months
  const liveMonthCount = 1 + selectedPastLive.size
  const liveTotal = liveMonthCount * liveSubscriptionPrice

  async function initiatePayment() {
    if (paying) return
    setPaying(true)
    try {
      const isVideo = mode === 'video'
      const packageIds = isVideo
        ? Array.from(selected)
        : [liveMonthPackageId, ...Array.from(selectedPastLive)].filter(Boolean) as string[]
      const amount = isVideo ? total : liveTotal
      const description = isVideo
        ? `Video package(s): ${selectedPackages.map((p) => p.name).join(', ')}`
        : `Live classes: ${[liveMonthLabel, ...unsubscribedPastPackages.filter((p) => selectedPastLive.has(p.id)).map((p) => `${MONTHS[p.month - 1]} ${p.year}`)].filter(Boolean).join(', ')}`

      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderType: isVideo ? 'video' : 'live',
          packageIds,
          amount,
          description,
          isRecurring: !isVideo && isRecurring,
        }),
      })

      const data = await res.json() as { paymentUrl?: string; error?: string }
      if (!res.ok || !data.paymentUrl) {
        toast.error(data.error ?? 'Failed to initiate payment. Please try again.')
        return
      }

      window.location.href = data.paymentUrl
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setPaying(false)
    }
  }

  const label = triggerLabel ?? (defaultMode === 'live' ? 'Subscribe' : 'Buy')

  return (
    <>
      <Button
        onClick={handleOpen}
        size={triggerSize}
        className="bg-primary text-primary-foreground hover:bg-accent"
      >
        {defaultMode === 'live'
          ? <Radio className="w-4 h-4 mr-2" />
          : <ShoppingCart className="w-4 h-4 mr-2" />
        }
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <div className="flex gap-2 mb-1">
              <button
                onClick={() => setMode('video')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  mode === 'video'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:bg-muted/30'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                Buy Video Package
              </button>
              {liveSubscriptionEnabled && (
                <button
                  onClick={() => setMode('live')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    mode === 'live'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted/30'
                  }`}
                >
                  <Radio className="w-4 h-4" />
                  Subscribe for Live Classes
                </button>
              )}
            </div>
            <DialogTitle className="sr-only">
              {mode === 'video' ? 'Buy Video Package' : 'Subscribe for Live Classes'}
            </DialogTitle>
          </DialogHeader>

          {mode === 'video' ? (
            <div className="py-1 space-y-2">
              {videoPackages.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No video packages available.</p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground pb-1">
                    {mandatoryPackageId ? 'Selected package is required. Add more optionally.' : 'Select packages to purchase.'}
                  </p>
                  {videoPackages.map((pkg) => {
                    const mandatory = pkg.id === mandatoryPackageId
                    const alreadyOwned = subscribedSet.has(pkg.id)
                    const checked = selected.has(pkg.id)
                    if (alreadyOwned) {
                      return (
                        <div
                          key={pkg.id}
                          className="flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-muted/20 opacity-60 cursor-not-allowed"
                        >
                          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{pkg.name}</span>
                              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 shrink-0 gap-1">
                                Already Purchased
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-sm font-semibold text-primary">Rs {pkg.price.toFixed(2)}</span>
                              <span className="text-xs text-muted-foreground">
                                {pkg.chapterCount} chapter{pkg.chapterCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return (
                      <label
                        key={pkg.id}
                        htmlFor={`buy-pkg-${pkg.id}`}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                          mandatory
                            ? 'border-primary/30 bg-primary/5 cursor-default'
                            : 'border-border/60 hover:bg-muted/20 cursor-pointer'
                        }`}
                      >
                        <Checkbox
                          id={`buy-pkg-${pkg.id}`}
                          checked={checked}
                          onCheckedChange={() => toggle(pkg.id)}
                          disabled={mandatory}
                          className="mt-0.5 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{pkg.name}</span>
                            {mandatory && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-primary/10 text-primary border-primary/20 shrink-0 gap-1"
                              >
                                <Lock className="w-2.5 h-2.5" /> Required
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-sm font-semibold text-primary">
                              Rs {pkg.price.toFixed(2)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {pkg.chapterCount} chapter{pkg.chapterCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </label>
                    )
                  })}

                  {selected.size > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/60 mt-2">
                      <span className="text-sm font-medium">
                        {selected.size} package{selected.size !== 1 ? 's' : ''} selected
                      </span>
                      <span className="text-base font-bold text-primary">
                        Rs {total.toFixed(2)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : isCurrentMonthSubscribed ? (
            /* Already have current month — redirect to live classes */
            <div className="py-6 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
              <p className="font-semibold">Already Subscribed</p>
              <p className="text-sm text-muted-foreground">
                You are already subscribed to {liveMonthLabel ?? 'this month'}'s live classes.
              </p>
              <Link
                href="/dashboard/live-classes"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-accent text-sm font-medium transition-colors"
              >
                Go to Live Classes <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            /* Not subscribed to current month — show subscription form */
            <div className="py-2 space-y-4">
              {/* Current month — mandatory */}
              <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 gap-1">
                    <Lock className="w-2.5 h-2.5" /> Required
                  </Badge>
                  <span className="text-xs text-muted-foreground">current month</span>
                </div>
                <p className="font-semibold">{liveMonthLabel} Live Classes</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xl font-bold text-primary">Rs {liveSubscriptionPrice.toFixed(2)}</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
              </div>

              {/* Past months — optional */}
              {unsubscribedPastPackages.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Also add past months (optional)
                  </p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {unsubscribedPastPackages.map((pkg) => (
                      <label
                        key={pkg.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg border border-border/60 hover:bg-muted/20 cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={selectedPastLive.has(pkg.id)}
                          onCheckedChange={() => togglePastLive(pkg.id)}
                          className="shrink-0"
                        />
                        <span className="flex-1 text-sm">{MONTHS[pkg.month - 1]} {pkg.year}</span>
                        <span className="text-sm font-semibold text-primary shrink-0">
                          Rs {liveSubscriptionPrice.toFixed(2)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Recurring toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <Checkbox
                  id="live-recurring"
                  checked={isRecurring}
                  onCheckedChange={(v) => setIsRecurring(!!v)}
                />
                <div>
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-primary" />
                    Recurring subscription
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {isRecurring ? 'Auto-renews each month' : 'One-off — you will need to manually renew'}
                  </p>
                </div>
              </label>

              {/* Total */}
              {liveMonthCount > 1 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/60">
                  <span className="text-sm font-medium">{liveMonthCount} months</span>
                  <span className="text-base font-bold text-primary">Rs {liveTotal.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {mode === 'live' && isCurrentMonthSubscribed ? 'Close' : 'Cancel'}
            </Button>
            {!(mode === 'live' && isCurrentMonthSubscribed) && (
              <Button
                onClick={initiatePayment}
                disabled={!mounted || paying || (mode === 'video' ? selected.size === 0 : !liveMonthPackageId)}
                className="bg-primary text-primary-foreground hover:bg-accent"
              >
                {paying
                  ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  : <CheckCircle2 className="w-4 h-4 mr-2" />
                }
                {!mounted
                  ? 'Loading…'
                  : paying
                    ? 'Redirecting…'
                    : `Pay Rs ${(mode === 'video' ? total : liveTotal).toFixed(2)}`
                }
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

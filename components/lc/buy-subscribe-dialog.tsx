'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShoppingCart, Radio, Lock, RefreshCw, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'

interface VideoPackageItem {
  id: string
  name: string
  price: number
  chapterCount: number
}

interface Props {
  videoPackages: VideoPackageItem[]
  mandatoryPackageId?: string
  subscribedPackageIds?: string[]
  gradeName: string
  liveSubscriptionPrice: number
  liveSubscriptionEnabled: boolean
  liveMonthPackageId?: string
  liveMonthLabel?: string
  defaultMode?: 'video' | 'live'
  triggerLabel?: string
  triggerSize?: 'sm' | 'default'
  isLoggedIn?: boolean
}

export function BuySubscribeDialog({
  videoPackages,
  mandatoryPackageId,
  subscribedPackageIds = [],
  gradeName,
  liveSubscriptionPrice,
  liveSubscriptionEnabled,
  liveMonthPackageId,
  liveMonthLabel,
  defaultMode = 'video',
  triggerLabel,
  triggerSize = 'default',
  isLoggedIn,
}: Props) {
  const subscribedSet = new Set(subscribedPackageIds)
  const isLiveAlreadySubscribed = !!(liveMonthPackageId && subscribedSet.has(liveMonthPackageId))
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'video' | 'live'>(defaultMode)
  const [isRecurring, setIsRecurring] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(mandatoryPackageId ? [mandatoryPackageId] : [])
  )

  function handleOpen() {
    setMode(defaultMode)
    setSelected(new Set(mandatoryPackageId ? [mandatoryPackageId] : []))
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

  const selectedPackages = videoPackages.filter((p) => selected.has(p.id))
  const total = selectedPackages.reduce((sum, p) => sum + p.price, 0)

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
        <DialogContent className="max-w-md">
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
          ) : isLiveAlreadySubscribed ? (
            <div className="py-6 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
              <p className="font-semibold">Already Subscribed</p>
              <p className="text-sm text-muted-foreground">
                You are already subscribed to {liveMonthLabel ?? 'this month'}'s live classes.
              </p>
            </div>
          ) : (
            <div className="py-2 space-y-4">
              <div className="p-4 rounded-lg border border-border/60 bg-muted/20">
                <p className="font-semibold">{gradeName}</p>
                {liveMonthLabel && (
                  <p className="text-sm text-primary font-medium mt-0.5">{liveMonthLabel} Live Classes</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-2xl font-bold text-primary">
                    Rs {liveSubscriptionPrice.toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Get access to all live classes and subscriber-exclusive content for {liveMonthLabel ?? 'this month'}.
                </p>
              </div>
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
                    {isRecurring
                      ? 'Auto-renews each month'
                      : 'One-off — you will need to manually renew'}
                  </p>
                </div>
              </label>
            </div>
          )}

          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {mode === 'live' && isLiveAlreadySubscribed ? 'Close' : 'Cancel'}
            </Button>
            {!(mode === 'live' && isLiveAlreadySubscribed) && (
              <Button asChild className="bg-primary text-primary-foreground hover:bg-accent">
                <Link href={
                  mode === 'live' && liveMonthPackageId
                    ? `/contact?type=live&package=${liveMonthPackageId}&month=${encodeURIComponent(liveMonthLabel ?? '')}&recurring=${isRecurring ? '1' : '0'}`
                    : '/contact'
                }>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {mode === 'video' ? 'Contact to Buy' : 'Contact to Subscribe'}
                </Link>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

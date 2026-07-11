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
  isNextMonthMode?: boolean
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
  isNextMonthMode = false,
}: Props) {
  const subscribedSet = new Set(subscribedPackageIds)
  const subscribedLiveSet = new Set(subscribedLivePackageIds)
  const isCurrentMonthSubscribed = !!(liveMonthPackageId && subscribedLiveSet.has(liveMonthPackageId))
  const canIncludeLive = liveSubscriptionEnabled && !!liveMonthPackageId && !isCurrentMonthSubscribed

  const [open, setOpen] = useState(false)
  const [includeLive, setIncludeLive] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(mandatoryPackageId ? [mandatoryPackageId] : [])
  )
  const [selectedPastLive, setSelectedPastLive] = useState<Set<string>>(new Set())
  const [paying, setPaying] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  function handleOpen() {
    setIncludeLive(defaultMode === 'live' && canIncludeLive)
    setSelected(new Set(mandatoryPackageId ? [mandatoryPackageId] : []))
    setSelectedPastLive(new Set())
    setAgreed(false)
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
  const videoTotal = selectedPackages.reduce((sum, p) => sum + p.price, 0)
  const unsubscribedPastPackages = pastLivePackages.filter((p) => !subscribedLiveSet.has(p.id))
  const liveMonthCount = 1 + selectedPastLive.size
  const liveTotal = liveMonthCount * liveSubscriptionPrice

  const hasLiveSelected = includeLive && canIncludeLive
  const hasVideoSelected = selected.size > 0
  const combinedTotal = (hasLiveSelected ? liveTotal : 0) + (hasVideoSelected ? videoTotal : 0)
  const orderType = hasLiveSelected && hasVideoSelected ? 'mixed' : hasLiveSelected ? 'live' : 'video'

  async function initiatePayment() {
    if (paying || combinedTotal === 0 || !agreed) return
    setPaying(true)
    try {
      const videoIds = Array.from(selected)
      const liveIds = hasLiveSelected
        ? [liveMonthPackageId!, ...Array.from(selectedPastLive)]
        : []
      const packageIds = [...liveIds, ...videoIds]

      const liveParts = hasLiveSelected
        ? [liveMonthLabel, ...unsubscribedPastPackages.filter((p) => selectedPastLive.has(p.id)).map((p) => `${MONTHS[p.month - 1]} ${p.year}`)].filter(Boolean)
        : []
      const videoParts = hasVideoSelected ? selectedPackages.map((p) => p.name) : []
      const description = [
        liveParts.length ? `Live classes: ${liveParts.join(', ')}` : '',
        videoParts.length ? `Video: ${videoParts.join(', ')}` : '',
      ].filter(Boolean).join(' + ')

      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderType,
          packageIds,
          amount: combinedTotal,
          description,
          isRecurring: hasLiveSelected,
          liveAmount: hasLiveSelected ? liveSubscriptionPrice : undefined,
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
        <DialogContent className="max-w-md flex flex-col max-h-[90vh]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Complete your purchase</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1 overflow-y-auto flex-1 min-h-0">
            {/* Live subscription section */}
            {liveSubscriptionEnabled && liveMonthPackageId && (
              <div>
                {isCurrentMonthSubscribed ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-muted/20 opacity-60">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{liveMonthLabel} Live Classes</p>
                      <p className="text-xs text-muted-foreground">Already subscribed</p>
                    </div>
                    <Link
                      href="/dashboard/live-classes"
                      onClick={() => setOpen(false)}
                      className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      View <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                ) : (
                  <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    includeLive ? 'border-primary/40 bg-primary/5' : 'border-border/60 hover:bg-muted/20'
                  }`}>
                    <Checkbox
                      checked={includeLive}
                      onCheckedChange={(v) => {
                        setIncludeLive(!!v)
                        if (!v) setSelectedPastLive(new Set())
                      }}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <Radio className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="font-semibold text-sm">{liveMonthLabel} Live Classes</span>
                        <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400 gap-1">
                          <RefreshCw className="w-2.5 h-2.5" /> Auto-renewing
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-primary">Rs {liveSubscriptionPrice.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground">/month · recurring</span>
                      </div>
                      {isNextMonthMode && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                          Access begins 1&nbsp;{liveMonthLabel}
                        </p>
                      )}

                      {/* Past months — shown only when live is selected */}
                      {includeLive && unsubscribedPastPackages.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">
                            Also add past months (optional)
                          </p>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {unsubscribedPastPackages.map((pkg) => (
                              <label
                                key={pkg.id}
                                className="flex items-center gap-2 p-2 rounded border border-border/40 hover:bg-muted/20 cursor-pointer"
                              >
                                <Checkbox
                                  checked={selectedPastLive.has(pkg.id)}
                                  onCheckedChange={() => togglePastLive(pkg.id)}
                                  className="shrink-0"
                                />
                                <span className="flex-1 text-xs">{MONTHS[pkg.month - 1]} {pkg.year}</span>
                                <span className="text-xs font-semibold text-primary shrink-0">
                                  Rs {liveSubscriptionPrice.toFixed(2)}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </label>
                )}
              </div>
            )}

            {/* Video packages section */}
            {videoPackages.length > 0 && (
              <div>
                {liveSubscriptionEnabled && (
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Video packages (one-time purchase)
                  </p>
                )}
                <div className="space-y-1.5">
                  {videoPackages.map((pkg) => {
                    const alreadyOwned = subscribedSet.has(pkg.id)
                    const mandatory = pkg.id === mandatoryPackageId
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
                              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 shrink-0">
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
                              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 shrink-0 gap-1">
                                <Lock className="w-2.5 h-2.5" /> Required
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-sm font-semibold text-primary">Rs {pkg.price.toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground">
                              {pkg.chapterCount} chapter{pkg.chapterCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Recurring notice (only when live is included) */}
            {hasLiveSelected && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <RefreshCw className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">
                    Auto-renews at Rs {liveSubscriptionPrice.toFixed(2)}/month
                  </span>
                  {' '}— live classes renew automatically each month. Cancel anytime from your{' '}
                  <span className="font-medium">Subscriptions</span> page.
                </p>
              </div>
            )}

            {/* Combined order summary */}
            {combinedTotal > 0 && (hasLiveSelected || selected.size > 0) && (
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <table className="w-full text-xs">
                  <tbody>
                    {hasLiveSelected && (
                      <tr className="border-b border-border/40">
                        <td className="px-3 py-2 text-muted-foreground">
                          {liveMonthLabel} Live{liveMonthCount > 1 ? ` × ${liveMonthCount} months` : ''}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">Rs {liveTotal.toFixed(2)}</td>
                      </tr>
                    )}
                    {selectedPackages.map((p) => (
                      <tr key={p.id} className="border-b border-border/40">
                        <td className="px-3 py-2 text-muted-foreground">{p.name}</td>
                        <td className="px-3 py-2 text-right font-medium">Rs {p.price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/20">
                      <td className="px-3 py-2 font-semibold">Total</td>
                      <td className="px-3 py-2 text-right font-bold text-primary">Rs {combinedTotal.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Terms agreement — required before paying */}
          <label className="flex items-start gap-2 pt-3 border-t border-border/40 cursor-pointer">
            <Checkbox
              checked={agreed}
              onCheckedChange={(v) => setAgreed(!!v)}
              className="mt-0.5 shrink-0"
            />
            <span className="text-xs text-muted-foreground leading-relaxed">
              I have read and agree to the{' '}
              <Link href="/terms" target="_blank" className="text-primary hover:underline">
                Terms &amp; Conditions
              </Link>{' '}
              of LessonComputer.mu.
            </span>
          </label>

          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={initiatePayment}
              disabled={!mounted || paying || combinedTotal === 0 || !agreed}
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
                  : `Pay Rs ${combinedTotal.toFixed(2)}`
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

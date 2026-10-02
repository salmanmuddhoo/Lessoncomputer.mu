'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ShoppingCart, Radio, Lock, RefreshCw, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { usePrice, useCurrency } from '@/components/lc/currency-provider'
import { formatAccessDuration } from '@/lib/format-duration'
import { track, cart, type Product } from '@/lib/track'
import { formatMoney, DEFAULT_CURRENCY } from '@/lib/currency-format'
import { CardLogos } from '@/components/lc/card-logos'
import {
  CONSENT_TEXT, RECORDING_NOTICE, PAYMENT_PROCESSOR_LINE, type ConsentType, type ConsentTicks,
} from '@/lib/legal/checkout-consents'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

interface VideoPackageItem {
  id: string
  name: string
  price: number
  chapterCount: number
  expiresDays?: number | null
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
  gradeSlug?: string
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
  autoOpen?: boolean
  renewalDateLabel?: string
}

export function BuySubscribeDialog({
  videoPackages,
  mandatoryPackageId,
  subscribedPackageIds = [],
  subscribedLivePackageIds = [],
  gradeName,
  gradeSlug = '',
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
  autoOpen = false,
  renewalDateLabel,
}: Props) {
  const price = usePrice()
  const currency = useCurrency()
  const subscribedSet = new Set(subscribedPackageIds)
  const subscribedLiveSet = new Set(subscribedLivePackageIds)
  const isCurrentMonthSubscribed = !!(liveMonthPackageId && subscribedLiveSet.has(liveMonthPackageId))
  const canIncludeLive = liveSubscriptionEnabled && !!liveMonthPackageId && !isCurrentMonthSubscribed
  // Live is enabled/priced for this grade, but no live package has been set up for the
  // current month yet (done in Admin → Monthly Content) — so there is nothing to charge.
  const liveNotSetUp = defaultMode === 'live' && liveSubscriptionEnabled && !liveMonthPackageId

  // The product this specific trigger button represents, for add_to_cart/begin_checkout —
  // derived from how this dialog instance was configured, not from in-dialog selections
  // (which only exist once it's already open).
  const clickedProduct: Product | null = defaultMode === 'live'
    ? (liveMonthPackageId
      ? { item_id: liveMonthPackageId, item_name: `${liveMonthLabel ?? gradeName} Live Classes`, item_category: 'live_class', item_category2: gradeSlug, price: liveSubscriptionPrice, quantity: 1 }
      : null)
    : (mandatoryPackageId
      ? (() => {
          const pkg = videoPackages.find((p) => p.id === mandatoryPackageId)
          return pkg ? { item_id: pkg.id, item_name: pkg.name, item_category: 'video_package', item_category2: gradeSlug, price: pkg.price, quantity: 1 } : null
        })()
      : null)

  const [open, setOpen] = useState(false)
  const [includeLive, setIncludeLive] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(mandatoryPackageId ? [mandatoryPackageId] : [])
  )
  const [selectedPastLive, setSelectedPastLive] = useState<Set<string>>(new Set())
  const [paying, setPaying] = useState(false)
  // Checkout tick boxes (Developer Work §5): none pre-ticked; each stores when it was ticked.
  const [ticks, setTicks] = useState<Partial<Record<ConsentType, string>>>({})
  const [studentUnder18, setStudentUnder18] = useState<boolean | null>(null)
  const international = !!currency.international
  const consentsOk =
    !!ticks.terms &&
    studentUnder18 !== null &&
    (!studentUnder18 || !!ticks.guardian) &&
    (!international || !!ticks.immediate_access)
  function setTick(type: ConsentType, on: boolean) {
    setTicks((prev) => {
      const next = { ...prev }
      if (on) next[type] = new Date().toISOString()
      else delete next[type]
      return next
    })
  }
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  function handleOpen() {
    setIncludeLive(defaultMode === 'live' && canIncludeLive)
    setSelected(new Set(mandatoryPackageId ? [mandatoryPackageId] : []))
    setSelectedPastLive(new Set())
    setTicks({})
    setStudentUnder18(null)
    setOpen(true)
    // The "payment step" is now showing with the chosen product — covers both a direct
    // click and the ?buy= auto-resume flow after login, which has no click of its own.
    // (user_id/user_data omitted — this dialog isn't passed the logged-in user's id/email.)
    if (clickedProduct) {
      track('begin_checkout', cart([clickedProduct]))
    }
  }

  // Resume a purchase a guest started before signing in: the grade page passes autoOpen=true
  // (decoded from a `?buy=...` param preserved through the login/register redirect) so the
  // dialog reopens by itself instead of dropping the new customer on a bare page.
  const autoOpenedRef = useRef(false)
  useEffect(() => {
    if (autoOpen && !autoOpenedRef.current) {
      autoOpenedRef.current = true
      handleOpen()
      // Strip the one-time intent params so a refresh/back-navigation doesn't reopen it.
      window.history.replaceState(null, '', window.location.pathname)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen])

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
    if (paying || combinedTotal === 0 || !consentsOk) return
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
          consents: { ...ticks, studentUnder18: studentUnder18 ?? undefined } satisfies ConsentTicks,
        }),
      })

      const data = await res.json() as { paymentUrl?: string; error?: string }
      if (!res.ok || !data.paymentUrl) {
        toast.error(data.error ?? 'Failed to initiate payment. Please try again.')
        return
      }

      const liveItems: Product[] = hasLiveSelected
        ? [
          { item_id: liveMonthPackageId!, item_name: liveMonthLabel ?? gradeName, item_category: 'live_class', item_category2: gradeSlug, price: liveSubscriptionPrice, quantity: 1 },
          ...unsubscribedPastPackages.filter((p) => selectedPastLive.has(p.id)).map((p): Product => ({
            item_id: p.id, item_name: `${MONTHS[p.month - 1]} ${p.year} Live Classes`, item_category: 'live_class', item_category2: gradeSlug, price: liveSubscriptionPrice, quantity: 1,
          })),
        ]
        : []
      const videoItems: Product[] = selectedPackages.map((p) => ({
        item_id: p.id, item_name: p.name, item_category: 'video_package', item_category2: gradeSlug, price: p.price, quantity: 1,
      }))
      track('add_payment_info', cart([...liveItems, ...videoItems], { payment_type: 'card' }))

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
        onClick={() => {
          if (clickedProduct) track('add_to_cart', { grade: gradeSlug, ...cart([clickedProduct]) })
          handleOpen()
        }}
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
        <DialogContent className="max-w-md flex flex-col max-h-[85dvh] z-[60]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Complete your purchase</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1 overflow-y-auto flex-1 min-h-0">
            {/* Live enabled for this grade, but this month's live classes aren't open yet. */}
            {liveNotSetUp && (
              <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20">
                <Radio className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Live classes aren&apos;t open for this month yet</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {gradeName} live classes for the current month haven&apos;t been set up yet. Please check
                    back soon — you&apos;ll be able to subscribe once they&apos;re available.
                  </p>
                </div>
              </div>
            )}

            {/* Live subscription section — only when the dialog was opened from a live
                "Subscribe" entry point (defaultMode='live'). Video entry points show
                only video packages, and vice versa. */}
            {defaultMode === 'live' && liveSubscriptionEnabled && liveMonthPackageId && (
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
                        <span className="text-lg font-bold text-primary">{price(liveSubscriptionPrice)}</span>
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
                                  {price(liveSubscriptionPrice)}
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

            {/* Video packages section — only when opened from a video entry point
                (defaultMode='video'). Hidden for live "Subscribe" flows. */}
            {defaultMode === 'video' && videoPackages.length > 0 && (
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
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              <span className="text-sm font-semibold text-primary">{price(pkg.price)}</span>
                              <span className="text-xs text-muted-foreground">
                                {pkg.chapterCount} chapter{pkg.chapterCount !== 1 ? 's' : ''}
                              </span>
                              <span className="text-xs text-muted-foreground">{formatAccessDuration(pkg.expiresDays)}</span>
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
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            <span className="text-sm font-semibold text-primary">{price(pkg.price)}</span>
                            <span className="text-xs text-muted-foreground">
                              {pkg.chapterCount} chapter{pkg.chapterCount !== 1 ? 's' : ''}
                            </span>
                            <span className="text-xs text-muted-foreground">{formatAccessDuration(pkg.expiresDays)}</span>
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Subscription terms (only when live is included) — Developer Work §4 */}
            {hasLiveSelected && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <RefreshCw className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground leading-relaxed space-y-1.5">
                  <p>
                    <span className="font-medium text-foreground">Monthly subscription: {formatMoney(liveSubscriptionPrice, DEFAULT_CURRENCY)} per month</span>
                    {currency.currency === 'USD' && <> (shown as {price(liveSubscriptionPrice)})</>}, charged automatically to the same card each month until you cancel.
                  </p>
                  {renewalDateLabel && <p>Next renewal: <span className="font-medium text-foreground">{renewalDateLabel}</span>.</p>}
                  <p>
                    To cancel, go to <span className="font-medium">Orders and Subscriptions</span> in your account and choose
                    Cancel recurring. You keep access until the end of the month you have paid for.
                  </p>
                  <p>
                    A secure payment token is stored with MIPS so the same card can be charged each month. The token is
                    limited to a maximum of {formatMoney(liveSubscriptionPrice, DEFAULT_CURRENCY)} per monthly payment, and
                    cancelling the subscription deactivates it.
                  </p>
                </div>
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
                        <td className="px-3 py-2 text-right font-medium">{price(liveTotal)}</td>
                      </tr>
                    )}
                    {selectedPackages.map((p) => (
                      <tr key={p.id} className="border-b border-border/40">
                        <td className="px-3 py-2 text-muted-foreground">{p.name}</td>
                        <td className="px-3 py-2 text-right font-medium">{price(p.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/20">
                      <td className="px-3 py-2 font-semibold">Total payable (incl. any tax)</td>
                      <td className="px-3 py-2 text-right font-bold text-primary">{formatMoney(combinedTotal, DEFAULT_CURRENCY)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {currency.currency === 'USD' && combinedTotal > 0 && (
            <p className="text-[11px] text-muted-foreground pt-1">
              Prices are shown in USD as an indication ({price(combinedTotal)}). Your card is charged exactly{' '}
              <span className="font-medium text-foreground">{formatMoney(combinedTotal, DEFAULT_CURRENCY)}</span> in Mauritian
              Rupees; your bank may apply its own exchange rate and fees.
            </p>
          )}

          {/* Payment details, policies and confirmations — Developer Work §4–5 */}
          {!liveNotSetUp && (
            <div className="pt-3 border-t border-border/40 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardLogos />
                <p className="text-[11px] text-muted-foreground flex-1 min-w-[180px]">{PAYMENT_PROCESSOR_LINE}</p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Read our{' '}
                <Link href="/terms" target="_blank" className="text-primary hover:underline">Terms of Service</Link>,{' '}
                <Link href="/refunds" target="_blank" className="text-primary hover:underline">Refund Policy</Link> and{' '}
                <Link href="/delivery" target="_blank" className="text-primary hover:underline">Delivery Policy</Link>.
              </p>

              <fieldset className="space-y-1.5">
                <legend className="text-xs font-medium text-foreground mb-1">Who is the student?</legend>
                <div className="flex flex-col sm:flex-row gap-2">
                  {[
                    { value: true, label: 'Under 18 — I am their parent or guardian' },
                    { value: false, label: '18 or over' },
                  ].map((opt) => (
                    <label key={String(opt.value)} className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs cursor-pointer ${studentUnder18 === opt.value ? 'border-primary/50 bg-primary/5' : 'border-border/60'}`}>
                      <input
                        type="radio"
                        name="student-age"
                        checked={studentUnder18 === opt.value}
                        onChange={() => { setStudentUnder18(opt.value); if (!opt.value) setTick('guardian', false) }}
                        className="accent-primary"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox checked={!!ticks.terms} onCheckedChange={(v) => setTick('terms', !!v)} className="mt-0.5 shrink-0" />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  I have read and accept the{' '}
                  <Link href="/terms" target="_blank" className="text-primary hover:underline">Terms of Service</Link>, the{' '}
                  <Link href="/refunds" target="_blank" className="text-primary hover:underline">Refund Policy</Link> and the{' '}
                  <Link href="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</Link>.
                </span>
              </label>

              {studentUnder18 && (
                <label className="flex items-start gap-2 cursor-pointer">
                  <Checkbox checked={!!ticks.guardian} onCheckedChange={(v) => setTick('guardian', !!v)} className="mt-0.5 shrink-0" />
                  <span className="text-xs text-muted-foreground leading-relaxed">{CONSENT_TEXT.guardian}</span>
                </label>
              )}

              {international && (
                <label className="flex items-start gap-2 cursor-pointer">
                  <Checkbox checked={!!ticks.immediate_access} onCheckedChange={(v) => setTick('immediate_access', !!v)} className="mt-0.5 shrink-0" />
                  <span className="text-xs text-muted-foreground leading-relaxed">{CONSENT_TEXT.immediate_access}</span>
                </label>
              )}

              <p className="text-[11px] text-muted-foreground leading-relaxed">{RECORDING_NOTICE}</p>
            </div>
          )}

          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>{liveNotSetUp ? 'Close' : 'Cancel'}</Button>
            {!liveNotSetUp && (
              <Button
                onClick={initiatePayment}
                disabled={!mounted || paying || combinedTotal === 0 || !consentsOk}
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
                    : `Pay ${formatMoney(combinedTotal, DEFAULT_CURRENCY)}`
                }
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

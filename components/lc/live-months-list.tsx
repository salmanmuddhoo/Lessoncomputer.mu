'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import Link from 'next/link'
import { Radio, CheckCircle2, Lock, Calendar, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { LiveMonthChapters } from '@/components/lc/live-month-chapters'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

interface Chapter {
  id: string
  title: string
  description: string | null
  order_index: number
}

interface MonthPackage {
  id: string
  name: string
  month: number
  year: number
  chapters: Chapter[]
}

interface VideoPackageItem {
  id: string
  name: string
  price: number
  chapterCount: number
}

interface Props {
  packages: MonthPackage[]
  subscribedPackageIds: string[]
  videosByChapter: Record<string, any[]>
  documentsByChapter: Record<string, any[]>
  currentMonth: number
  currentYear: number
  liveSubscriptionPrice: number
  gradeName?: string
  videoPackages?: VideoPackageItem[]
  subscribedVideoPackageIds?: string[]
}

export function LiveMonthsList({
  packages,
  subscribedPackageIds,
  videosByChapter,
  documentsByChapter,
  currentMonth,
  currentYear,
  liveSubscriptionPrice,
  gradeName,
}: Props) {
  const subscribedSet = new Set(subscribedPackageIds)
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      packages
        .filter(p => subscribedSet.has(p.id))
        .map(p => [p.id, true])
    )
  )

  // Past months multi-select dialog state
  const [pastDialog, setPastDialog] = useState<{ selectedIds: Set<string> } | null>(null)

  const unsubscribedPastPackages = packages.filter(pkg => {
    const isPast = pkg.year < currentYear || (pkg.year === currentYear && pkg.month < currentMonth)
    return isPast && !subscribedSet.has(pkg.id)
  })

  function openPastDialog(clickedId: string) {
    setPastDialog({ selectedIds: new Set([clickedId]) })
  }

  function togglePastMonth(id: string) {
    setPastDialog(prev => {
      if (!prev) return prev
      const next = new Set(prev.selectedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { selectedIds: next }
    })
  }

  function buildContactUrl() {
    if (!pastDialog) return '#'
    const selected = [...pastDialog.selectedIds]
    const selectedPkgs = unsubscribedPastPackages.filter(p => selected.includes(p.id))
    const months = selectedPkgs.map(p => encodeURIComponent(`${MONTHS[p.month - 1]} ${p.year}`)).join(',')
    const pkgs = selected.join(',')
    return `/contact?type=live_past&packages=${pkgs}&months=${months}`
  }

  function toggleMonth(id: string) {
    setOpenMonths(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <>
      <div className="space-y-4">
        {packages.map(pkg => {
          const isSubscribed = subscribedSet.has(pkg.id)
          const isCurrentMonth = pkg.month === currentMonth && pkg.year === currentYear
          const isPast = pkg.year < currentYear || (pkg.year === currentYear && pkg.month < currentMonth)
          const monthLabel = `${MONTHS[pkg.month - 1]} ${pkg.year}`
          const isOpen = openMonths[pkg.id] ?? false

          return (
            <div
              key={pkg.id}
              className={`rounded-2xl border overflow-hidden ${
                isSubscribed ? 'border-primary/30' : 'border-border/60'
              }`}
            >
              {/* Month header */}
              <div className={`px-5 py-4 flex items-center justify-between gap-4 ${
                isSubscribed ? 'bg-primary/5' : 'bg-card'
              }`}>
                <button
                  onClick={() => isSubscribed && toggleMonth(pkg.id)}
                  className={`flex items-center gap-3 flex-wrap flex-1 text-left ${
                    isSubscribed ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <span className="font-bold">{monthLabel}</span>
                  {isCurrentMonth && (
                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                      Current
                    </Badge>
                  )}
                  {isSubscribed && (
                    <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Subscribed
                    </span>
                  )}
                  {!isSubscribed && isPast && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Lock className="w-2.5 h-2.5" /> Past month
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {pkg.chapters.length} chapter{pkg.chapters.length !== 1 ? 's' : ''}
                  </span>
                </button>

                <div className="flex items-center gap-2 shrink-0">
                  {!isSubscribed && (
                    <>
                      <span className="text-sm font-bold text-primary">
                        Rs {Number(liveSubscriptionPrice).toFixed(2)}
                      </span>
                      {isPast ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPastDialog(pkg.id)}
                        >
                          Buy Videos
                        </Button>
                      ) : (
                        <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-accent">
                          <Link href={`/contact?type=live&package=${pkg.id}&month=${encodeURIComponent(monthLabel)}`}>
                            Subscribe
                          </Link>
                        </Button>
                      )}
                    </>
                  )}
                  {isSubscribed && (
                    <button
                      onClick={() => toggleMonth(pkg.id)}
                      className="p-1.5 rounded-lg hover:bg-muted/40 transition-colors"
                    >
                      {isOpen
                        ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      }
                    </button>
                  )}
                </div>
              </div>

              {/* Subscribed content — collapsible */}
              {isSubscribed && isOpen && (
                <div className="px-5 pb-5">
                  {isPast && !isCurrentMonth && (
                    <p className="text-xs text-muted-foreground mt-3 mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Live classes for this month have ended — videos and documents are still accessible.
                    </p>
                  )}
                  <LiveMonthChapters
                    chapters={pkg.chapters}
                    videosByChapter={videosByChapter}
                    documentsByChapter={documentsByChapter}
                  />
                </div>
              )}

              {/* Locked preview for non-subscribed past months */}
              {!isSubscribed && isPast && pkg.chapters.length > 0 && (
                <div className="px-5 py-3 border-t border-border/40">
                  <p className="text-xs text-muted-foreground">
                    Includes: {pkg.chapters.map(ch => ch.title).join(' · ')}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Past months purchase dialog */}
      {pastDialog && (
        <Dialog open onOpenChange={() => setPastDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-primary" />
                Buy Past Month Videos
              </DialogTitle>
            </DialogHeader>

            <p className="text-sm text-muted-foreground">
              Select the months you'd like to purchase. Contact us and we'll get you set up.
            </p>

            <div className="space-y-2 my-2">
              {unsubscribedPastPackages.map(pkg => {
                const monthLabel = `${MONTHS[pkg.month - 1]} ${pkg.year}`
                const checked = pastDialog.selectedIds.has(pkg.id)
                return (
                  <label
                    key={pkg.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => togglePastMonth(pkg.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{monthLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        {pkg.chapters.length} chapter{pkg.chapters.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-primary shrink-0">
                      Rs {Number(liveSubscriptionPrice).toFixed(2)}
                    </span>
                  </label>
                )
              })}
            </div>

            {pastDialog.selectedIds.size > 1 && (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
                <span className="text-sm font-medium">Total ({pastDialog.selectedIds.size} months)</span>
                <span className="text-sm font-bold text-primary">
                  Rs {(pastDialog.selectedIds.size * Number(liveSubscriptionPrice)).toFixed(2)}
                </span>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setPastDialog(null)}>Cancel</Button>
              <Button
                asChild
                disabled={pastDialog.selectedIds.size === 0}
                className="bg-primary text-primary-foreground hover:bg-accent"
              >
                <Link href={buildContactUrl()}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Contact to Subscribe
                </Link>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Radio, CheckCircle2, Lock, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
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

interface Props {
  packages: MonthPackage[]
  subscribedPackageIds: string[]
  videosByChapter: Record<string, any[]>
  documentsByChapter: Record<string, any[]>
  currentMonth: number
  currentYear: number
  liveSubscriptionPrice: number
}

export function LiveMonthsList({
  packages,
  subscribedPackageIds,
  videosByChapter,
  documentsByChapter,
  currentMonth,
  currentYear,
  liveSubscriptionPrice,
}: Props) {
  const subscribedSet = new Set(subscribedPackageIds)
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      packages
        .filter(p => subscribedSet.has(p.id))
        .map(p => [p.id, true])
    )
  )

  function toggleMonth(id: string) {
    setOpenMonths(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
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
                    <Button
                      asChild
                      size="sm"
                      variant={isPast ? 'outline' : 'default'}
                      className={isPast ? '' : 'bg-primary text-primary-foreground hover:bg-accent'}
                    >
                      <Link href={`/contact?type=live&package=${pkg.id}&month=${encodeURIComponent(monthLabel)}`}>
                        {isPast ? 'Buy Videos' : 'Subscribe'}
                      </Link>
                    </Button>
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
  )
}

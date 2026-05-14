'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShoppingCart, CheckCircle2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

export interface DialogPackage {
  id: string
  name: string
  price: number
  month: number
  year: number
  chapterCount: number
}

function isCurrentOrFuture(pkg: DialogPackage) {
  const now = new Date()
  const cm = now.getMonth() + 1
  const cy = now.getFullYear()
  return pkg.year > cy || (pkg.year === cy && pkg.month >= cm)
}

interface Props {
  packages: DialogPackage[]
  /** When true, renders a simple "Buy" confirm dialog for one package */
  singlePackage?: boolean
  /** Optional label override for the trigger button */
  label?: string
}

export function SubscribeSection({ packages, singlePackage = false, label }: Props) {
  const [open, setOpen] = useState(false)

  // In multi-select mode: current/future are mandatory (always checked), previous are optional
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(packages.filter(isCurrentOrFuture).map((p) => p.id))
  )

  function toggle(id: string) {
    const pkg = packages.find((p) => p.id === id)
    if (!pkg || isCurrentOrFuture(pkg)) return // mandatory — can't uncheck
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectedPackages = packages.filter((p) => selected.has(p.id))
  const total = selectedPackages.reduce((sum, p) => sum + Number(p.price), 0)

  const triggerLabel = label ?? (singlePackage ? 'Buy' : 'Subscribe')

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size={singlePackage ? 'sm' : 'default'}
        className="bg-primary text-primary-foreground hover:bg-accent"
      >
        {!singlePackage && <ShoppingCart className="w-4 h-4 mr-2" />}
        {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {singlePackage ? 'Confirm Purchase' : 'Choose Packages'}
            </DialogTitle>
          </DialogHeader>

          {singlePackage ? (
            /* Simple confirmation for a single previous-month package */
            <div className="py-2 space-y-3">
              {packages.map((pkg) => (
                <div key={pkg.id} className="p-4 rounded-lg border border-border/60 bg-muted/20">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold">{pkg.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {MONTHS[pkg.month - 1]} {pkg.year}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-primary">
                      Rs {Number(pkg.price).toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {pkg.chapterCount} chapter{pkg.chapterCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Your access will be activated once payment is confirmed.
              </p>
            </div>
          ) : (
            /* Multi-select: mandatory current + optional previous */
            <div className="py-1 space-y-2">
              <p className="text-xs text-muted-foreground pb-1">
                Current month is required. Previous months are optional add-ons.
              </p>
              {packages.map((pkg) => {
                const mandatory = isCurrentOrFuture(pkg)
                const checked = selected.has(pkg.id)
                return (
                  <label
                    key={pkg.id}
                    htmlFor={`pkg-${pkg.id}`}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      mandatory
                        ? 'border-primary/30 bg-primary/5 cursor-default'
                        : 'border-border/60 hover:bg-muted/20 cursor-pointer'
                    }`}
                  >
                    <Checkbox
                      id={`pkg-${pkg.id}`}
                      checked={checked}
                      onCheckedChange={() => toggle(pkg.id)}
                      disabled={mandatory}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{pkg.name}</span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {MONTHS[pkg.month - 1]} {pkg.year}
                        </Badge>
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
                          Rs {Number(pkg.price).toFixed(2)}
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

              <p className="text-xs text-muted-foreground">
                Your access will be activated once payment is confirmed.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              asChild
              className="bg-primary text-primary-foreground hover:bg-accent"
            >
              <Link href="/contact">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Contact to Subscribe
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

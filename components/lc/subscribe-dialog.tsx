'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShoppingCart, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
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
  /** Show as individual card with single Buy button instead of multi-select */
  singlePackage?: boolean
}

export function SubscribeSection({ packages, singlePackage = false }: Props) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(packages.filter(isCurrentOrFuture).map((p) => p.id))
  )

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const total = packages
    .filter((p) => selected.has(p.id))
    .reduce((sum, p) => sum + Number(p.price), 0)

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size={singlePackage ? 'sm' : 'default'}
        className="bg-primary text-primary-foreground hover:bg-accent"
      >
        {singlePackage ? 'Buy' : (
          <><ShoppingCart className="w-4 h-4 mr-2" /> Subscribe</>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {singlePackage ? 'Confirm Purchase' : 'Select Packages'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 py-1">
            {packages.map((pkg) => {
              const isCurrent = isCurrentOrFuture(pkg)
              const isChecked = selected.has(pkg.id)
              return (
                <label
                  key={pkg.id}
                  htmlFor={`pkg-${pkg.id}`}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border/60 hover:bg-muted/20 cursor-pointer transition-colors"
                >
                  <Checkbox
                    id={`pkg-${pkg.id}`}
                    checked={isChecked}
                    onCheckedChange={() => toggle(pkg.id)}
                    className="mt-0.5 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{pkg.name}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {MONTHS[pkg.month - 1]} {pkg.year}
                      </Badge>
                      {isCurrent && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-primary/10 text-primary border-primary/20 shrink-0"
                        >
                          Current
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
          </div>

          {selected.size > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/60">
              <span className="text-sm font-medium">
                {selected.size} package{selected.size !== 1 ? 's' : ''} selected
              </span>
              <span className="text-base font-bold text-primary">
                Rs {total.toFixed(2)}
              </span>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Your access will be activated once payment is confirmed. Contact us to complete your subscription.
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              asChild
              disabled={selected.size === 0}
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

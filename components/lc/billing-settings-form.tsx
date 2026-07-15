'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Props {
  initialBillingDay: number
  initialCutoffDay: number
}

export function BillingSettingsForm({ initialBillingDay, initialCutoffDay }: Props) {
  const [billingDay, setBillingDay] = useState(String(initialBillingDay))
  const [cutoffDay, setCutoffDay]   = useState(String(initialCutoffDay))
  const [saving, setSaving] = useState(false)

  async function save() {
    const bd = parseInt(billingDay, 10)
    const cd = parseInt(cutoffDay, 10)
    if (isNaN(bd) || bd < 1 || bd > 28) { toast.error('Billing day must be 1–28'); return }
    if (isNaN(cd) || cd < 1 || cd > 28) { toast.error('Cutoff day must be 1–28'); return }
    if (cd >= bd) { toast.error('Cutoff day must be before billing day'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/billing-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingDay: bd, cutoffDay: cd }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Save failed'); return }
      toast.success('Billing settings saved')
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 p-5 rounded-xl border border-border/60 bg-card">
      <div>
        <h3 className="font-semibold text-sm">Subscription Billing</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Controls when recurring payments are collected and the enrolment cutoff for each month.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="cutoff-day" className="text-sm">
            Enrolment cutoff day
          </Label>
          <Input
            id="cutoff-day"
            type="number"
            min={1}
            max={28}
            value={cutoffDay}
            onChange={(e) => setCutoffDay(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Students joining after this day subscribe for next month.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="billing-day" className="text-sm">
            Billing day
          </Label>
          <Input
            id="billing-day"
            type="number"
            min={1}
            max={28}
            value={billingDay}
            onChange={(e) => setBillingDay(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Day on which recurring payments are charged for the next month.
          </p>
        </div>
      </div>

      <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 space-y-1">
        <p><strong>Example with cutoff {cutoffDay}, billing {billingDay}:</strong></p>
        <p>• On or before day {cutoffDay} → buy current month, immediate access</p>
        <p>• After day {cutoffDay} → buy next month, access from 1st of that month</p>
        <p>• On day {billingDay} → recurring charge collected for next month</p>
      </div>

      <Button onClick={save} disabled={saving} size="sm">
        {saving ? 'Saving…' : 'Save billing settings'}
      </Button>
    </div>
  )
}

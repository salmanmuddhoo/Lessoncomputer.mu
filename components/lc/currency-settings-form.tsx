'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export function CurrencySettingsForm({ initialUsdRate }: { initialUsdRate: number | null }) {
  const [rate, setRate] = useState(initialUsdRate != null ? String(initialUsdRate) : '')
  const [saving, setSaving] = useState(false)

  async function save() {
    const trimmed = rate.trim()
    const parsed = trimmed === '' ? null : Number(trimmed)
    if (parsed != null && (Number.isNaN(parsed) || parsed <= 0)) {
      toast.error('Enter a positive rate, or leave blank to disable USD display.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/currency-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usdRate: parsed }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Save failed'); return }
      toast.success('Currency settings saved')
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const example = (() => {
    const r = Number(rate)
    return r > 0 ? `e.g. a Rs 1,000 package shows as $${(1000 / r).toFixed(2)}` : ''
  })()

  return (
    <div className="space-y-4 p-5 rounded-xl border border-border/60 bg-card">
      <div>
        <h3 className="font-semibold text-sm">Currency Display</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Visitors outside Mauritius see prices in USD (converted from Rupees). Payment is still
          charged in MUR. Leave blank to always show Rupees.
        </p>
      </div>

      <div className="space-y-1.5 max-w-xs">
        <Label htmlFor="usd-rate" className="text-sm">Exchange rate — MUR per 1 USD</Label>
        <Input
          id="usd-rate"
          type="number"
          min={0}
          step="0.01"
          placeholder="e.g. 46"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">{example || 'Blank / 0 = disabled (show MUR only).'}</p>
      </div>

      <Button onClick={save} disabled={saving} size="sm">
        {saving ? 'Saving…' : 'Save currency settings'}
      </Button>
    </div>
  )
}

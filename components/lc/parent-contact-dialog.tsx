'use client'

import { useState } from 'react'
import { Phone, MessageCircle, Loader2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ParentContactDialog({ open, onClose, onSuccess }: Props) {
  const [countryCode, setCountryCode] = useState('230') // Mauritius by default
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  // Full international number, digits only (country code + local number).
  const fullNumber = `${countryCode}${phone}`.replace(/[^\d]/g, '')
  const isValid = fullNumber.length >= 8

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    setSaving(true)
    try {
      const res = await fetch('/api/parent-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullNumber }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Could not save contact. Please try again.')
        return
      }
      toast.success("Parent contact saved. A WhatsApp invitation has been sent.")
      onSuccess()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm" aria-describedby="parent-contact-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            Parent Contact Required
          </DialogTitle>
          <DialogDescription id="parent-contact-desc">
            Before joining live classes, please provide your parent&apos;s WhatsApp number.
            They will receive an invitation to join the parents&apos; group.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="parent-phone">Parent&apos;s WhatsApp Number</Label>
            <div className="flex gap-2">
              <div className="inline-flex items-center rounded-lg border border-border/60 bg-muted pl-2.5 shrink-0 focus-within:ring-2 focus-within:ring-ring">
                <span className="text-sm text-muted-foreground">+</span>
                <Input
                  aria-label="Country code"
                  type="tel"
                  inputMode="numeric"
                  placeholder="230"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value.replace(/[^\d]/g, ''))}
                  disabled={saving}
                  className="w-16 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
                />
              </div>
              <Input
                id="parent-phone"
                type="tel"
                inputMode="numeric"
                placeholder="5XXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ''))}
                disabled={saving}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Include the country code. Mauritius is 230 (e.g. +230 57123456).
            </p>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex gap-2.5 text-xs text-muted-foreground">
            <MessageCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>
              A WhatsApp message will be sent to this number with a link to join the parents&apos; group.
              This is required only once.
            </span>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !isValid}
              className="bg-primary text-primary-foreground hover:bg-accent"
            >
              {saving
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Saving…</>
                : 'Save & Continue'
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

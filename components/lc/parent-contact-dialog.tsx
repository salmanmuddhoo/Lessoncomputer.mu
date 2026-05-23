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
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/parent-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
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
              <span className="inline-flex items-center px-3 rounded-lg border border-border/60 bg-muted text-sm text-muted-foreground shrink-0">
                +230
              </span>
              <Input
                id="parent-phone"
                type="tel"
                inputMode="numeric"
                placeholder="5XXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={saving}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the number without the country code. E.g. 57123456
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
              disabled={saving || !phone.trim()}
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

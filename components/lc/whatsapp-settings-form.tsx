'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  initialGroupUrl: string
}

export function WhatsAppSettingsForm({ initialGroupUrl }: Props) {
  const [groupUrl, setGroupUrl] = useState(initialGroupUrl)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function handleSave() {
    setSaving(true)
    const { error } = await (supabase as any)
      .from('site_settings')
      .upsert({ id: 1, whatsapp_group_url: groupUrl.trim() || null, updated_at: new Date().toISOString() }, { onConflict: 'id' })

    if (error) toast.error(`Save failed: ${error.message}`)
    else toast.success('WhatsApp group URL saved')
    setSaving(false)
  }

  return (
    <div className="rounded-xl border border-border/60 p-6 space-y-5">
      <div>
        <h3 className="text-sm font-semibold mb-0.5 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-green-500" />
          Parents WhatsApp Group
        </h3>
        <p className="text-xs text-muted-foreground">
          When a student provides their parent&apos;s phone number for the first time, the system
          automatically sends a WhatsApp invitation to this group link.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="wa-group-url">WhatsApp Group Invite URL</Label>
        <Input
          id="wa-group-url"
          type="url"
          placeholder="https://chat.whatsapp.com/xxxxxxxxxxxxxxxxxxxxxxx"
          value={groupUrl}
          onChange={(e) => setGroupUrl(e.target.value)}
          disabled={saving}
        />
        <p className="text-xs text-muted-foreground">
          Get this from WhatsApp group → Invite via link. Leave empty to disable automatic invitations.
        </p>
      </div>

      <div className="rounded-lg border border-muted bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium">Required Vercel env vars for WhatsApp sending:</p>
        <ul className="font-mono space-y-0.5 text-[11px] pl-2">
          <li>WHATSAPP_PHONE_NUMBER_ID</li>
          <li>WHATSAPP_ACCESS_TOKEN</li>
        </ul>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="bg-primary text-primary-foreground hover:bg-accent"
        size="sm"
      >
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />}
        Save
      </Button>
    </div>
  )
}

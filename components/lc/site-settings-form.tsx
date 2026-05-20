'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, Facebook, Instagram, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.24 8.24 0 004.83 1.56V6.8a4.85 4.85 0 01-1.07-.11z" />
    </svg>
  )
}

interface Props {
  initial: {
    facebook_url: string
    instagram_url: string
    tiktok_url: string
    whatsapp_number: string
  }
}

export function SiteSettingsForm({ initial }: Props) {
  const [values, setValues] = useState(initial)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  function set(key: keyof typeof values, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    const { error } = await (supabase as any)
      .from('site_settings')
      .upsert({
        id: 1,
        facebook_url: values.facebook_url.trim() || null,
        instagram_url: values.instagram_url.trim() || null,
        tiktok_url: values.tiktok_url.trim() || null,
        whatsapp_number: values.whatsapp_number.trim() || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

    if (error) toast.error(`Save failed: ${error.message}`)
    else toast.success('Settings saved')
    setSaving(false)
  }

  return (
    <div className="rounded-xl border border-border/60 p-6 space-y-5">
      <div>
        <h3 className="text-sm font-semibold mb-0.5">Social Media & Contact</h3>
        <p className="text-xs text-muted-foreground">Links appear in the site footer. WhatsApp number enables the chat button on all pages.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-2 text-xs">
            <Facebook className="w-3.5 h-3.5 text-[#1877F2]" /> Facebook URL
          </Label>
          <Input
            value={values.facebook_url}
            onChange={(e) => set('facebook_url', e.target.value)}
            placeholder="https://facebook.com/yourpage"
            className="text-sm font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-2 text-xs">
            <Instagram className="w-3.5 h-3.5 text-pink-500" /> Instagram URL
          </Label>
          <Input
            value={values.instagram_url}
            onChange={(e) => set('instagram_url', e.target.value)}
            placeholder="https://instagram.com/yourhandle"
            className="text-sm font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-2 text-xs">
            <TikTokIcon className="w-3.5 h-3.5" /> TikTok URL
          </Label>
          <Input
            value={values.tiktok_url}
            onChange={(e) => set('tiktok_url', e.target.value)}
            placeholder="https://tiktok.com/@yourhandle"
            className="text-sm font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-2 text-xs">
            <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" /> WhatsApp Number
          </Label>
          <Input
            value={values.whatsapp_number}
            onChange={(e) => set('whatsapp_number', e.target.value)}
            placeholder="23052312345 (digits only, no + or spaces)"
            className="text-sm font-mono"
          />
          <p className="text-[11px] text-muted-foreground">Include country code. E.g. for Mauritius: 23052312345</p>
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="bg-primary text-primary-foreground hover:bg-accent"
        size="sm"
      >
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />}
        Save Settings
      </Button>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Megaphone, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  initial: {
    banner_enabled: boolean
    banner_text: string
    banner_link: string
  }
}

export function BannerSettingsForm({ initial }: Props) {
  const [enabled, setEnabled] = useState(initial.banner_enabled)
  const [text, setText] = useState(initial.banner_text)
  const [link, setLink] = useState(initial.banner_link)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function handleSave() {
    setSaving(true)
    const { error } = await (supabase as any)
      .from('site_settings')
      .upsert({
        id: 1,
        banner_enabled: enabled,
        banner_text: text.trim() || null,
        banner_link: link.trim() || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

    if (error) toast.error(`Save failed: ${error.message}`)
    else toast.success('Banner saved')
    setSaving(false)
  }

  return (
    <div className="rounded-xl border border-border/60 p-6 space-y-5">
      <div>
        <h3 className="text-sm font-semibold mb-0.5 flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-primary" /> Top Banner
        </h3>
        <p className="text-xs text-muted-foreground">A scrolling announcement across the top of every public page — sales, tuition start dates, general info.</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
          <Label htmlFor="banner-enabled" className="text-sm font-medium cursor-pointer">Show banner</Label>
          <Switch id="banner-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Banner text</Label>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Tuition for Term 3 starts 15 September — enrol now!"
            className="text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Link (optional)</Label>
          <Input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="/grades or https://…"
            className="text-sm font-mono"
          />
          <p className="text-[11px] text-muted-foreground">Clicking the banner goes here. Leave blank for plain text.</p>
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="bg-primary text-primary-foreground hover:bg-accent"
        size="sm"
      >
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />}
        Save Banner
      </Button>
    </div>
  )
}

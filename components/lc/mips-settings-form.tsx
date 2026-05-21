'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Loader2, CreditCard, FlaskConical, Globe } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  initialEnvironment: 'test' | 'production'
}

export function MipsSettingsForm({ initialEnvironment }: Props) {
  const [env, setEnv] = useState<'test' | 'production'>(initialEnvironment)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function handleSave() {
    setSaving(true)
    const { error } = await (supabase as any)
      .from('site_settings')
      .upsert({ id: 1, mips_environment: env, updated_at: new Date().toISOString() }, { onConflict: 'id' })

    if (error) toast.error(`Save failed: ${error.message}`)
    else toast.success(`MIPS switched to ${env} environment`)
    setSaving(false)
  }

  return (
    <div className="rounded-xl border border-border/60 p-6 space-y-5">
      <div>
        <h3 className="text-sm font-semibold mb-0.5 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          MIPS Payment Gateway
        </h3>
        <p className="text-xs text-muted-foreground">
          Switch between test and production environments. Credentials are configured in Vercel environment variables.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setEnv('test')}
          className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-medium ${
            env === 'test'
              ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400'
              : 'border-border/60 hover:border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          <FlaskConical className="w-5 h-5" />
          Test Environment
          <span className="text-[10px] font-normal opacity-70">Sandbox — no real charges</span>
        </button>

        <button
          onClick={() => setEnv('production')}
          className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-medium ${
            env === 'production'
              ? 'border-green-500 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400'
              : 'border-border/60 hover:border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          <Globe className="w-5 h-5" />
          Production
          <span className="text-[10px] font-normal opacity-70">Live payments — real charges</span>
        </button>
      </div>

      {env === 'production' && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 p-3 text-xs text-orange-700 dark:text-orange-400">
          <strong>Warning:</strong> Production mode is active. All student payments will be charged to real cards.
        </div>
      )}

      <div className="text-xs text-muted-foreground space-y-1">
        <p className="font-medium">Required Vercel env vars:</p>
        <ul className="font-mono space-y-0.5 text-[11px] pl-2">
          <li>MIPS_AUTH_USERNAME / MIPS_AUTH_PASSWORD</li>
          <li>MIPS_ID_MERCHANT / MIPS_ID_ENTITY</li>
          <li>MIPS_ID_OPERATOR / MIPS_OPERATOR_PASSWORD</li>
          <li>MIPS_HASH_SALT / MIPS_CIPHER_KEY</li>
          <li>NEXT_PUBLIC_SITE_URL</li>
        </ul>
        <p className="mt-1">Also configure the IMN callback URL in the MiPS merchant back office:<br/>
          <span className="font-mono">{'{your-domain}'}/api/payment/callback</span>
        </p>
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

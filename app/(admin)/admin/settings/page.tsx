import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { AccountForm } from './account-form'
import { SiteSettingsForm } from '@/components/lc/site-settings-form'
import { MipsSettingsForm } from '@/components/lc/mips-settings-form'
import { WhatsAppSettingsForm } from '@/components/lc/whatsapp-settings-form'
import { BillingSettingsForm } from '@/components/lc/billing-settings-form'

export const metadata: Metadata = { title: 'Admin Settings' }

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: siteSettings }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, avatar_url, role')
      .eq('id', user!.id)
      .single(),
    (supabase as any)
      .from('site_settings')
      .select('facebook_url, instagram_url, tiktok_url, whatsapp_number, mips_environment, whatsapp_group_url, billing_day, cutoff_day')
      .eq('id', 1)
      .single(),
  ])

  const ss = (siteSettings ?? {}) as {
    facebook_url: string | null
    instagram_url: string | null
    tiktok_url: string | null
    whatsapp_number: string | null
    mips_environment: string | null
    whatsapp_group_url: string | null
    billing_day: number | null
    cutoff_day: number | null
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your admin account and site configuration.</p>
      </div>

      <div className="max-w-lg space-y-8">
        <AccountForm
          userId={user!.id}
          email={user!.email ?? ''}
          fullName={profile?.full_name ?? ''}
        />

        <SiteSettingsForm
          initial={{
            facebook_url: ss.facebook_url ?? '',
            instagram_url: ss.instagram_url ?? '',
            tiktok_url: ss.tiktok_url ?? '',
            whatsapp_number: ss.whatsapp_number ?? '',
          }}
        />

        <MipsSettingsForm
          initialEnvironment={(ss.mips_environment as 'test' | 'production') ?? 'test'}
        />

        <WhatsAppSettingsForm
          initialGroupUrl={ss.whatsapp_group_url ?? ''}
        />

        <BillingSettingsForm
          initialBillingDay={ss.billing_day ?? 28}
          initialCutoffDay={ss.cutoff_day ?? 20}
        />
      </div>
    </div>
  )
}

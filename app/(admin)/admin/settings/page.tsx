import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { AccountForm } from './account-form'
import { SiteSettingsForm } from '@/components/lc/site-settings-form'
import { BillingSettingsForm } from '@/components/lc/billing-settings-form'
import { ManageAdmins } from '@/components/lc/manage-admins'
import { CurrencySettingsForm } from '@/components/lc/currency-settings-form'

export const metadata: Metadata = { title: 'Admin Settings' }

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: siteSettings }, { data: adminRows }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, avatar_url, role, can_access_finance')
      .eq('id', user!.id)
      .single(),
    (supabase as any)
      .from('site_settings')
      .select('facebook_url, instagram_url, tiktok_url, whatsapp_number, mips_environment, billing_day, cutoff_day, usd_rate')
      .eq('id', 1)
      .single(),
    (supabase as any)
      .from('profiles')
      .select('id, full_name, can_access_finance, created_at')
      .eq('role', 'admin')
      .order('full_name', { ascending: true }),
  ])

  const admins = ((adminRows ?? []) as any[]).map((a) => ({ id: a.id as string, name: (a.full_name ?? null) as string | null, canAccessFinance: !!a.can_access_finance }))
  const canManageFinance = (profile as any)?.can_access_finance === true
  // Only the first (original) admin may remove other admins.
  const firstAdminId = [...((adminRows ?? []) as any[])]
    .sort((a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')))[0]?.id ?? null
  const canRemoveAdmins = firstAdminId === user!.id

  const ss = (siteSettings ?? {}) as {
    facebook_url: string | null
    instagram_url: string | null
    tiktok_url: string | null
    whatsapp_number: string | null
    mips_environment: string | null
    billing_day: number | null
    cutoff_day: number | null
    usd_rate: number | null
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your admin account and site configuration.</p>
      </div>

      {/* 2-column grid on desktop to use the horizontal space */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left column */}
        <div className="space-y-6">
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
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <BillingSettingsForm
            initialBillingDay={ss.billing_day ?? 28}
            initialCutoffDay={ss.cutoff_day ?? 20}
          />

          <CurrencySettingsForm initialUsdRate={ss.usd_rate ?? null} />

          <ManageAdmins admins={admins} currentUserId={user!.id} canManageFinance={canManageFinance} canRemoveAdmins={canRemoveAdmins} />
        </div>
      </div>
    </div>
  )
}

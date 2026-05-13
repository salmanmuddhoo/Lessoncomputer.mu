import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { AccountForm } from './account-form'

export const metadata: Metadata = { title: 'Admin Settings' }

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, role')
    .eq('id', user!.id)
    .single()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your admin account.</p>
      </div>

      <div className="max-w-lg">
        <AccountForm
          userId={user!.id}
          email={user!.email ?? ''}
          fullName={profile?.full_name ?? ''}
        />
      </div>
    </div>
  )
}

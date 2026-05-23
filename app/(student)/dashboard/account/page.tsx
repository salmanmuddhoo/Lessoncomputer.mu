import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { ProfileSettingsForm, PasswordSettingsForm } from './account-settings-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Phone } from 'lucide-react'

export const metadata: Metadata = { title: 'My Account' }

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: profile },
    { data: grades },
    { data: purchases },
  ] = await Promise.all([
    supabase.from('profiles').select('*, grade:grades(id, name)').eq('id', user.id).single(),
    supabase.from('grades').select('id, name').eq('is_active', true).order('order_index'),
    supabase.from('purchases').select('id').eq('student_id', user.id).eq('status', 'completed'),
  ])

  const currentGrade = profile?.grade as { id: string; name: string } | null
  const parentPhone = (profile as any)?.parent_phone as string | null

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Account</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your profile and settings.</p>
      </div>

      {/* ── Profile summary — full width ── */}
      <Card className="border-border/60 mb-6">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary shrink-0">
              {profile?.full_name ? profile.full_name[0].toUpperCase() : '?'}
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{profile?.full_name ?? 'Unnamed'}</p>
              <p className="text-muted-foreground text-sm truncate">{user.email}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge variant="secondary" className="text-xs capitalize">{profile?.role}</Badge>
                {currentGrade && (
                  <Badge variant="outline" className="text-xs">{currentGrade.name}</Badge>
                )}
              </div>
            </div>
            <div className="ml-auto hidden sm:grid grid-cols-2 gap-x-8 gap-y-1 text-sm shrink-0">
              <div>
                <p className="text-muted-foreground text-xs">Videos purchased</p>
                <p className="font-semibold">{purchases?.length ?? 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Member since</p>
                <p className="font-semibold">
                  {new Date(profile?.created_at ?? user.created_at).toLocaleDateString('en-MU', { dateStyle: 'medium' })}
                </p>
              </div>
            </div>
          </div>
          {/* Stats row on mobile */}
          <div className="mt-4 pt-4 border-t border-border/40 grid grid-cols-2 gap-3 text-sm sm:hidden">
            <div>
              <p className="text-muted-foreground text-xs">Videos purchased</p>
              <p className="font-semibold">{purchases?.length ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Member since</p>
              <p className="font-semibold">
                {new Date(profile?.created_at ?? user.created_at).toLocaleDateString('en-MU', { dateStyle: 'medium' })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 2-column grid on desktop ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Profile settings */}
        <ProfileSettingsForm
          userId={user.id}
          fullName={profile?.full_name ?? ''}
          currentGradeId={currentGrade?.id ?? null}
          grades={grades ?? []}
        />

        {/* Right: Parent contact + Change password stacked */}
        <div className="space-y-5">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                Parent Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {parentPhone ? (
                <>
                  <p className="text-sm font-mono font-medium">+230 {parentPhone}</p>
                  <p className="text-xs text-muted-foreground">
                    This number receives WhatsApp updates about your live classes. Contact support to change it.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No parent phone on file. You will be prompted to add one when joining a live class.
                </p>
              )}
            </CardContent>
          </Card>

          <PasswordSettingsForm />
        </div>
      </div>
    </div>
  )
}

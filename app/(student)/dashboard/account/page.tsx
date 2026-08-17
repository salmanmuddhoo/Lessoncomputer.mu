import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { ProfileSettingsForm, PasswordSettingsForm } from './account-settings-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Phone } from 'lucide-react'
import { formatWhatsAppDisplay } from '@/lib/phone'

export const metadata: Metadata = { title: 'My Account' }

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: profile },
    { data: grades },
    { data: subsRaw },
  ] = await Promise.all([
    supabase.from('profiles').select('*, grade:grades(id, name)').eq('id', user.id).single(),
    supabase.from('grades').select('id, name').eq('is_active', true).order('order_index'),
    (supabase as any)
      .from('student_subscriptions')
      .select('valid_from, valid_until, package:subscription_packages(package_type, grade:grades(id, name))')
      .eq('student_id', user.id)
      .eq('status', 'active'),
  ])

  const currentGrade = profile?.grade as { id: string; name: string } | null
  const parentPhone = (profile as any)?.parent_phone as string | null

  // Video packages are recorded as active student_subscriptions (package_type 'video'), not
  // in the legacy `purchases` table — count those, within their validity window.
  const muToday = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().split('T')[0] // Mauritius (UTC+4)
  const validSubs = ((subsRaw ?? []) as any[]).filter((s) =>
    (!s.valid_from || s.valid_from <= muToday) && (!s.valid_until || s.valid_until >= muToday)
  )
  const videosPurchased = validSubs.filter((s) => s.package?.package_type === 'video').length

  // Every grade the student is actively subscribed in (a student can hold live/video
  // subscriptions in more than one grade), falling back to the profile grade.
  const enrolledGrades: { id: string; name: string }[] = []
  const seenGrade = new Set<string>()
  for (const s of (subsRaw ?? []) as any[]) {
    const g = s.package?.grade
    if (g?.id && !seenGrade.has(g.id)) { seenGrade.add(g.id); enrolledGrades.push(g) }
  }
  if (enrolledGrades.length === 0 && currentGrade) enrolledGrades.push(currentGrade)

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
                {enrolledGrades.map((g) => (
                  <Badge key={g.id} variant="outline" className="text-xs">{g.name}</Badge>
                ))}
              </div>
            </div>
            <div className="ml-auto hidden sm:grid grid-cols-2 gap-x-8 gap-y-1 text-sm shrink-0">
              <div>
                <p className="text-muted-foreground text-xs">Videos purchased</p>
                <p className="font-semibold">{videosPurchased}</p>
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
              <p className="font-semibold">{videosPurchased}</p>
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
                  <p className="text-sm font-mono font-medium">{formatWhatsAppDisplay(parentPhone)}</p>
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

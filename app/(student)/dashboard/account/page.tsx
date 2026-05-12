import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata = { title: 'My Account' }

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: purchases } = await supabase
    .from('purchases')
    .select('id')
    .eq('student_id', user.id)
    .eq('status', 'completed')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">My Account</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Your profile and activity.</p>
      </div>

      <div className="max-w-lg space-y-4">
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                {profile?.full_name ? profile.full_name[0].toUpperCase() : '?'}
              </div>
              <div>
                <p className="font-semibold">{profile?.full_name ?? 'Unnamed'}</p>
                <p className="text-muted-foreground">{user.email}</p>
                <Badge variant="secondary" className="mt-1 capitalize text-xs">{profile?.role}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Videos purchased</span>
              <span className="font-semibold">{purchases?.length ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Member since</span>
              <span className="font-semibold">
                {new Date(profile?.created_at ?? user.created_at).toLocaleDateString('en-MU', { dateStyle: 'medium' })}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

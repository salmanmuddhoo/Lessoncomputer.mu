import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { OnboardingForm } from './onboarding-form'

export const metadata: Metadata = { title: 'Complete your profile' }

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await (supabase as any)
    .from('profiles').select('role, full_name, grade_id').eq('id', user.id).single()

  if (profile?.role === 'admin') redirect('/admin')
  if (profile?.grade_id) redirect('/dashboard') // already onboarded

  const { data: grades } = await (supabase as any)
    .from('grades').select('id, name').eq('is_active', true).order('order_index', { ascending: true })

  const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string }
  const initialName = profile?.full_name ?? meta.full_name ?? meta.name ?? ''

  return (
    <Card className="w-full max-w-md border-border/60 bg-card shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Almost there!</CardTitle>
        <CardDescription>Choose your grade so we can set up your learning space.</CardDescription>
      </CardHeader>
      <CardContent>
        <OnboardingForm grades={(grades ?? []) as { id: string; name: string }[]} initialName={initialName} />
      </CardContent>
    </Card>
  )
}

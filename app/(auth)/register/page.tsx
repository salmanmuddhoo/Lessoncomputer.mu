import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { RegisterForm } from './register-form'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Create Account',
  description: 'Create your LessonComputer.mu account to enrol in Cambridge Computer Science courses, watch video lessons and join live classes.',
  path: '/register',
})

export default async function RegisterPage() {
  const supabase = await createClient()
  const { data: grades } = await supabase
    .from('grades')
    .select('id, name')
    .eq('is_active', true)
    .order('order_index')

  return (
    <Suspense fallback={null}>
      <RegisterForm grades={grades ?? []} />
    </Suspense>
  )
}

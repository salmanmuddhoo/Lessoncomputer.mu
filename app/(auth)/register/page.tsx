import { createClient } from '@/lib/supabase/server'
import { RegisterForm } from './register-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Create Account | LessonComputer.mu' }

export default async function RegisterPage() {
  const supabase = await createClient()
  const { data: grades } = await supabase
    .from('grades')
    .select('id, name')
    .eq('is_active', true)
    .order('order_index')

  return <RegisterForm grades={grades ?? []} />
}

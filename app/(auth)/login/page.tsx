import { Suspense } from 'react'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'
import { LoginForm } from './login-form'

export const metadata: Metadata = pageMetadata({
  title: 'Sign In',
  description: 'Sign in to watch your lessons and join your live classes.',
  path: '/login',
})

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Mail, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type FormData = z.infer<typeof schema>

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/dashboard'
  const errorParam = searchParams.get('error')
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    // If there's an explicit redirectTo param, honour it; otherwise route by role
    if (searchParams.get('redirectTo')) {
      router.push(redirectTo)
      router.refresh()
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    router.push(profile?.role === 'admin' ? '/admin' : '/dashboard')
    router.refresh()
  }

  return (
    <Card className="w-full max-w-md border-border/60 bg-card shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
        <CardDescription>Sign in to your LessonComputer.mu account</CardDescription>
        {errorParam === 'account_suspended' && (
          <p className="mt-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            Your account has been suspended. Please contact support.
          </p>
        )}
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="pl-9"
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className="pl-9"
                {...register('password')}
              />
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-accent font-semibold"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Sign In
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center border-t border-border/40 pt-4">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary font-medium hover:underline">
            Sign up for free
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

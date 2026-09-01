import Link from 'next/link'
import { Header } from '@/components/lc/header'
import { Footer } from '@/components/lc/footer'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { LayoutDashboard, GraduationCap, LifeBuoy, Home } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Page Not Found' }

export default async function NotFound() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    profile = data
  }

  let grades: { name: string; slug: string }[] = []
  try {
    const { data } = await supabase
      .from('grades')
      .select('name, slug')
      .eq('is_active', true)
      .order('order_index', { ascending: true })
    grades = (data ?? []) as { name: string; slug: string }[]
  } catch { /* fall back to empty */ }

  const dashboardHref = profile?.role === 'admin' ? '/admin' : '/dashboard'

  return (
    <>
      <Header user={user ? { email: user.email, role: profile?.role } : null} grades={grades} />
      <main className="pt-[72px]">
        <section className="min-h-[70vh] flex items-center py-20">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
            <p className="font-serif text-7xl sm:text-8xl font-bold text-primary/80 mb-4">404</p>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-3">
              We couldn&apos;t find that page
            </h1>
            <p className="text-muted-foreground mb-10">
              The link may be mistyped or the page may have moved. Here are a few places to go instead.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-left">
              <Button asChild variant="outline" className="justify-start h-auto py-4 px-4">
                <Link href="/">
                  <Home className="w-4 h-4 mr-2.5 text-primary shrink-0" />
                  Homepage
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start h-auto py-4 px-4">
                <Link href={user ? dashboardHref : '/login'}>
                  <LayoutDashboard className="w-4 h-4 mr-2.5 text-primary shrink-0" />
                  {user ? 'My Dashboard' : 'Sign in'}
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start h-auto py-4 px-4">
                <Link href="/grades">
                  <GraduationCap className="w-4 h-4 mr-2.5 text-primary shrink-0" />
                  Browse Grades
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start h-auto py-4 px-4">
                <Link href="/contact">
                  <LifeBuoy className="w-4 h-4 mr-2.5 text-primary shrink-0" />
                  Contact Support
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

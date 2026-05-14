import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Package } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Subscriptions' }

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

export default async function StudentSubscriptionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('grade_id, grade:grades(id, name, color)')
    .eq('id', user.id)
    .single()

  const grade = profile?.grade as { id: string; name: string; color: string } | null

  if (!grade) {
    return (
      <div className="py-20 text-center">
        <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="font-semibold mb-2">No grade selected</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Set your grade in your account settings to see subscription packages.
        </p>
        <Button asChild size="sm">
          <Link href="/dashboard/account">Go to Account Settings</Link>
        </Button>
      </div>
    )
  }

  // Fetch active packages for student's grade
  const { data: packages } = await supabase
    .from('subscription_packages')
    .select('*, subscription_package_chapters(chapter_id, chapter:chapters(id, title, order_index))')
    .eq('grade_id', grade.id)
    .eq('is_active', true)
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  const hasPackages = (packages?.length ?? 0) > 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Subscription Packages</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Monthly packages available for{' '}
          <span className="font-medium" style={{ color: grade.color }}>{grade.name}</span>
        </p>
      </div>

      {hasPackages ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(packages ?? []).map((pkg: any) => {
            const chapters = (pkg.subscription_package_chapters ?? [])
              .map((spc: any) => spc.chapter)
              .filter(Boolean)
              .sort((a: any, b: any) => a.order_index - b.order_index)

            return (
              <div
                key={pkg.id}
                className="rounded-xl border border-border/60 bg-card flex flex-col overflow-hidden hover:border-primary/30 transition-colors"
              >
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-semibold leading-snug">{pkg.name}</h3>
                    <Badge variant="outline" className="text-xs shrink-0 whitespace-nowrap">
                      {MONTHS[pkg.month - 1]} {pkg.year}
                    </Badge>
                  </div>

                  {pkg.description && (
                    <p className="text-sm text-muted-foreground mb-3">{pkg.description}</p>
                  )}

                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Includes {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {chapters.map((ch: any) => (
                      <Badge key={ch.id} variant="secondary" className="text-xs">
                        {ch.title}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="px-5 py-4 border-t border-border/60 flex items-center justify-between">
                  <span className="text-lg font-bold text-primary">
                    Rs {Number(pkg.price).toFixed(2)}
                  </span>
                  <Button size="sm" className="bg-primary text-primary-foreground hover:bg-accent">
                    Subscribe
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="py-20 text-center rounded-xl border border-border/60">
          <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">
            No subscription packages available for {grade.name} yet.
          </p>
          <p className="text-sm text-muted-foreground mt-1">Check back soon.</p>
        </div>
      )}
    </div>
  )
}

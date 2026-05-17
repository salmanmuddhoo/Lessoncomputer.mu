import { createClient } from '@/lib/supabase/server'
import { VideoPackagesAccordion } from '@/components/lc/video-packages-accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  BookOpen, Package, ArrowRight, ShoppingCart, Lock,
} from 'lucide-react'

export const metadata = { title: 'My Video Packages' }

export default async function MyVideoPackagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('grade_id, grade:grades(id, name, color, slug)')
    .eq('id', user!.id)
    .single()

  const grade = profile?.grade as { id: string; name: string; color: string; slug: string } | null

  if (!grade) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold">My Video Packages</h1>
        </div>
        <div className="py-16 text-center rounded-xl border border-border/60">
          <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Set your grade to see video packages.</p>
          <Button asChild size="sm"><Link href="/dashboard/account">Account Settings</Link></Button>
        </div>
      </div>
    )
  }

  // Try to query with package_type='video' filter; fall back to all packages if column doesn't exist
  const SELECT = 'id, name, description, price, month, year, subscription_package_chapters(chapter_id, chapter:chapters(id, title, description, order_index))'

  const { data: typedPackages, error: typeErr } = await supabase
    .from('subscription_packages')
    .select(SELECT)
    .eq('grade_id', grade.id)
    .eq('package_type', 'video')
    .eq('is_active', true)
    .order('name', { ascending: true })

  const allVideoPackages = typeErr
    ? ((await supabase
        .from('subscription_packages')
        .select(SELECT)
        .eq('grade_id', grade.id)
        .eq('is_active', true)
        .order('name', { ascending: true })
      ).data ?? [])
    : (typedPackages ?? [])

  // All active subscriptions — no subscription_type filter
  const { data: subs } = await supabase
    .from('student_subscriptions')
    .select('package_id, purchased_at')
    .eq('student_id', user!.id)
    .eq('status', 'active')

  const subsByPackage = new Map((subs ?? []).filter((s: any) => s.package_id).map((s: any) => [s.package_id, s]))
  const subscribedPackageIds = new Set(subsByPackage.keys())

  const subscribedPackages = (allVideoPackages ?? []).filter((p: any) => subscribedPackageIds.has(p.id))
  const availablePackages = (allVideoPackages ?? []).filter((p: any) => !subscribedPackageIds.has(p.id))

  function getChapters(pkg: any) {
    return (pkg.subscription_package_chapters ?? [])
      .map((c: any) => c.chapter)
      .filter(Boolean)
      .sort((a: any, b: any) => a.order_index - b.order_index)
  }

  // Get chapters for subscribed packages
  const subscribedChapterIds = subscribedPackages.flatMap((p: any) =>
    (p.subscription_package_chapters ?? []).map((c: any) => c.chapter_id)
  )

  const videosByChapter: Record<string, any[]> = {}
  const documentsByChapter: Record<string, any[]> = {}

  if (subscribedChapterIds.length > 0) {
    const [{ data: videos }, { data: docs }] = await Promise.all([
      supabase.from('videos').select('*, grade:grades(name, color, slug)').in('chapter_id', subscribedChapterIds).eq('is_published', true),
      supabase.from('documents').select('*').in('chapter_id', subscribedChapterIds).eq('is_published', true),
    ])
    for (const v of videos ?? []) {
      videosByChapter[v.chapter_id] ??= []
      videosByChapter[v.chapter_id].push(v)
    }
    for (const d of docs ?? []) {
      documentsByChapter[d.chapter_id] ??= []
      documentsByChapter[d.chapter_id].push(d)
    }
  }

  // Shape subscribed packages for the accordion component
  const accordionPackages = subscribedPackages.map((pkg: any) => ({
    id: pkg.id,
    name: pkg.name,
    description: pkg.description ?? null,
    chapters: getChapters(pkg),
  }))

  const totalVideos = Object.values(videosByChapter).reduce((s, v) => s + v.length, 0)
  const totalDocs = Object.values(documentsByChapter).reduce((s, v) => s + v.length, 0)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">My Video Packages</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {subscribedPackages.length > 0
            ? `${totalVideos} video${totalVideos !== 1 ? 's' : ''}${totalDocs > 0 ? ` · ${totalDocs} doc${totalDocs !== 1 ? 's' : ''}` : ''} across ${subscribedPackages.length} package${subscribedPackages.length !== 1 ? 's' : ''}`
            : `Video packages for `}
          {subscribedPackages.length === 0 && (
            <span className="font-medium" style={{ color: grade.color }}>{grade.name}</span>
          )}
        </p>
      </div>

      {/* Subscribed packages with collapsible content */}
      {subscribedPackages.length > 0 && (
        <section className="mb-10">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" /> Your Packages
          </h2>
          <VideoPackagesAccordion
            packages={accordionPackages}
            videosByChapter={videosByChapter}
            documentsByChapter={documentsByChapter}
            grade={grade}
          />
        </section>
      )}

      {/* Available packages to buy */}
      {availablePackages.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-muted-foreground" />
            {subscribedPackages.length > 0 ? 'More Packages' : 'Available Packages'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {availablePackages.map((pkg: any) => {
              const chapters = getChapters(pkg)
              return (
                <div key={pkg.id} className="rounded-xl border border-border/60 bg-card flex flex-col overflow-hidden hover:border-primary/30 transition-colors">
                  <div className="p-5 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                      <h3 className="font-semibold text-sm">{pkg.name}</h3>
                    </div>
                    {pkg.description && (
                      <p className="text-sm text-muted-foreground mb-3">{pkg.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {chapters.map((ch: any) => (
                        <Badge key={ch.id} variant="secondary" className="text-xs">
                          <Lock className="w-2.5 h-2.5 mr-1" />{ch.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="px-5 py-3 border-t border-border/60 flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">Rs {Number(pkg.price).toFixed(2)}</span>
                    <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-accent h-8">
                      <Link href={`/contact?type=video&package=${pkg.id}`}>Buy</Link>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {subscribedPackages.length === 0 && availablePackages.length === 0 && (
        <div className="py-16 text-center rounded-xl border border-border/60">
          <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No video packages available for {grade.name} yet.</p>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-accent">
            <Link href="/grades">Browse Grades <ArrowRight className="ml-2 w-4 h-4" /></Link>
          </Button>
        </div>
      )}
    </div>
  )
}

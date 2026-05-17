import { createClient } from '@/lib/supabase/server'
import { VideoCard } from '@/components/lc/video-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  BookOpen, FileText, Download, FolderOpen,
  Package, ArrowRight, ShoppingCart, Lock,
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

  // All packages for the grade — no package_type filter (resilient if migration 015 not yet applied)
  const { data: allVideoPackages } = await supabase
    .from('subscription_packages')
    .select('id, name, description, price, month, year, subscription_package_chapters(chapter_id, chapter:chapters(id, title, description, order_index))')
    .eq('grade_id', grade.id)
    .eq('is_active', true)
    .order('name', { ascending: true })

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

  function getChapters(pkg: any) {
    return (pkg.subscription_package_chapters ?? [])
      .map((c: any) => c.chapter)
      .filter(Boolean)
      .sort((a: any, b: any) => a.order_index - b.order_index)
  }

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

      {/* Subscribed packages with content */}
      {subscribedPackages.length > 0 && (
        <section className="mb-10">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" /> Your Packages
          </h2>
          <div className="space-y-6">
            {subscribedPackages.map((pkg: any) => {
              const chapters = getChapters(pkg)
              const sub = subsByPackage.get(pkg.id)
              return (
                <div key={pkg.id} className="rounded-2xl border border-primary/20 overflow-hidden">
                  <div className="px-5 py-4 bg-primary/5 border-b border-border/60 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Package className="w-4 h-4 text-primary shrink-0" />
                        <h2 className="font-bold">{pkg.name}</h2>
                      </div>
                      {pkg.description && (
                        <p className="text-sm text-muted-foreground mb-1">{pkg.description}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-xs"
                          style={{ borderColor: `${grade.color}40`, color: grade.color }}
                        >
                          {grade.name}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}
                        </span>
                        {sub?.expires_at && (
                          <span className="text-xs text-muted-foreground">
                            · Expires {new Date(sub.expires_at).toLocaleDateString('en-MU', { dateStyle: 'medium' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-border/40">
                    {chapters.map((ch: any) => {
                      const chVideos = videosByChapter[ch.id] ?? []
                      const chDocs = documentsByChapter[ch.id] ?? []
                      if (chVideos.length === 0 && chDocs.length === 0) return null

                      return (
                        <div key={ch.id} className="px-5 py-4">
                          <div className="flex items-center gap-2 mb-4">
                            <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                            <h3 className="font-semibold text-sm">{ch.title}</h3>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {chVideos.length + chDocs.length} item{(chVideos.length + chDocs.length) !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {chVideos.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                              {chVideos.map((v: any) => <VideoCard key={v.id} video={v} />)}
                            </div>
                          )}
                          {chDocs.length > 0 && (
                            <div className="space-y-2">
                              {chDocs.map((doc: any) => (
                                <a
                                  key={doc.id}
                                  href={doc.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors group"
                                >
                                  <FileText className="w-5 h-5 text-primary shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{doc.title}</p>
                                    {doc.description && (
                                      <p className="text-xs text-muted-foreground truncate">{doc.description}</p>
                                    )}
                                  </div>
                                  <Download className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {chapters.every((ch: any) =>
                      (videosByChapter[ch.id]?.length ?? 0) === 0 &&
                      (documentsByChapter[ch.id]?.length ?? 0) === 0
                    ) && (
                      <div className="px-5 py-6 text-center">
                        <p className="text-sm text-muted-foreground">No content published in this package yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
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

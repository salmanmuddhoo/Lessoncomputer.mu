import { createClient } from '@/lib/supabase/server'
import { VideoCard } from '@/components/lc/video-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  BookOpen, FileText, Download, FolderOpen,
  Package, ArrowRight, Video, Radio, Lock,
} from 'lucide-react'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

export const metadata = { title: 'My Content' }

export default async function MyContentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const { data: rawSubs } = await supabase
    .from('student_subscriptions')
    .select(`
      package_id,
      subscription_type,
      package:subscription_packages(
        id, name, month, year, package_type,
        grade:grades(name, color, slug),
        subscription_package_chapters(
          chapter:chapters(id, title, description, order_index)
        )
      )
    `)
    .eq('student_id', user!.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const subs = (rawSubs ?? [])
    .map((s: any) => ({
      package_id: s.package_id,
      subscription_type: s.subscription_type ?? 'video',
      package: s.package
        ? {
            id: s.package.id,
            name: s.package.name,
            month: s.package.month,
            year: s.package.year,
            package_type: s.package.package_type ?? 'video',
            grade: s.package.grade,
            chapters: (s.package.subscription_package_chapters ?? [])
              .map((spc: any) => spc.chapter)
              .filter(Boolean)
              .sort((a: any, b: any) => a.order_index - b.order_index),
          }
        : null,
    }))
    .filter((s: any) => s.package !== null)

  const liveSubs = subs.filter((s: any) => s.package?.package_type === 'live_month')
  const videoSubs = subs.filter((s: any) => s.package?.package_type !== 'live_month')

  // Only fetch content for accessible chapters:
  // - video subs: all chapters
  // - live subs: only current month (previous months are locked)
  const accessibleLiveChapterIds = liveSubs
    .filter((s: any) => s.package.month === currentMonth && s.package.year === currentYear)
    .flatMap((s: any) => (s.package.chapters as any[]).map((ch: any) => ch.id))

  const videoChapterIds = videoSubs.flatMap((s: any) =>
    (s.package.chapters as any[]).map((ch: any) => ch.id)
  )

  const allAccessibleChapterIds = [...new Set([...accessibleLiveChapterIds, ...videoChapterIds])]

  const videosByChapter: Record<string, any[]> = {}
  const documentsByChapter: Record<string, any[]> = {}

  if (allAccessibleChapterIds.length > 0) {
    const [{ data: videos }, { data: docs }] = await Promise.all([
      supabase
        .from('videos')
        .select('*, grade:grades(name, color, slug)')
        .in('chapter_id', allAccessibleChapterIds)
        .eq('is_published', true),
      supabase
        .from('documents')
        .select('*')
        .in('chapter_id', allAccessibleChapterIds)
        .eq('is_published', true),
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

  if (subs.length === 0) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold">My Content</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Your subscribed videos and documents</p>
        </div>
        <div className="py-16 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No active subscriptions</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Subscribe to a package to access videos and documents.
          </p>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-accent">
            <Link href="/grades">
              Browse Grades <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const totalVideos = Object.values(videosByChapter).reduce((s, v) => s + v.length, 0)
  const totalDocs = Object.values(documentsByChapter).reduce((s, v) => s + v.length, 0)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">My Content</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {totalVideos} video{totalVideos !== 1 ? 's' : ''}
          {totalDocs > 0 ? ` · ${totalDocs} document${totalDocs !== 1 ? 's' : ''}` : ''}
          {' '}across {subs.length} subscription{subs.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="space-y-8">
        {/* Live class subscriptions */}
        {liveSubs.map((sub: any) => {
          const pkg = sub.package
          const isCurrentMonth = pkg.month === currentMonth && pkg.year === currentYear
          const monthLabel = `${MONTHS[pkg.month - 1]} ${pkg.year}`
          const pkgVideos = isCurrentMonth
            ? pkg.chapters.reduce((sum: number, ch: any) => sum + (videosByChapter[ch.id]?.length ?? 0), 0)
            : 0
          const pkgDocs = isCurrentMonth
            ? pkg.chapters.reduce((sum: number, ch: any) => sum + (documentsByChapter[ch.id]?.length ?? 0), 0)
            : 0

          return (
            <div key={sub.package_id} className={`rounded-2xl border overflow-hidden ${
              isCurrentMonth ? 'border-primary/20' : 'border-border/60'
            }`}>
              <div className={`px-5 py-4 border-b border-border/60 flex items-start justify-between gap-4 ${
                isCurrentMonth ? 'bg-primary/5' : 'bg-muted/10'
              }`}>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Radio className="w-4 h-4 text-primary shrink-0" />
                    <h2 className="font-bold">Live Classes — {monthLabel}</h2>
                    {isCurrentMonth && (
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                        Current Month
                      </Badge>
                    )}
                    {!isCurrentMonth && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Lock className="w-2.5 h-2.5" /> Locked
                      </Badge>
                    )}
                  </div>
                  {pkg.grade && (
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{ borderColor: `${pkg.grade.color}40`, color: pkg.grade.color }}
                    >
                      {pkg.grade.name}
                    </Badge>
                  )}
                  {isCurrentMonth && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {pkgVideos} video{pkgVideos !== 1 ? 's' : ''}
                      {pkgDocs > 0 ? ` · ${pkgDocs} doc${pkgDocs !== 1 ? 's' : ''}` : ''}
                    </span>
                  )}
                </div>
                {pkg.grade && (
                  <Button variant="outline" size="sm" asChild className="shrink-0">
                    <Link href={`/grades/${pkg.grade.slug}`}>View Grade</Link>
                  </Button>
                )}
              </div>

              {!isCurrentMonth ? (
                <div className="px-5 py-8 text-center">
                  <Lock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Content from {monthLabel} is locked. Only your current month subscription is accessible.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {pkg.chapters.map((ch: any) => {
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
                  {pkg.chapters.every((ch: any) =>
                    (videosByChapter[ch.id]?.length ?? 0) === 0 &&
                    (documentsByChapter[ch.id]?.length ?? 0) === 0
                  ) && (
                    <div className="px-5 py-6 text-center">
                      <Video className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No content published for this month yet.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Video package subscriptions */}
        {videoSubs.map((sub: any) => {
          const pkg = sub.package
          const pkgVideos = pkg.chapters.reduce(
            (sum: number, ch: any) => sum + (videosByChapter[ch.id]?.length ?? 0), 0
          )
          const pkgDocs = pkg.chapters.reduce(
            (sum: number, ch: any) => sum + (documentsByChapter[ch.id]?.length ?? 0), 0
          )

          return (
            <div key={sub.package_id} className="rounded-2xl border border-primary/20 overflow-hidden">
              <div className="px-5 py-4 bg-primary/5 border-b border-border/60 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Package className="w-4 h-4 text-primary shrink-0" />
                    <h2 className="font-bold">{pkg.name}</h2>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {pkg.grade && (
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{ borderColor: `${pkg.grade.color}40`, color: pkg.grade.color }}
                      >
                        {pkg.grade.name}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {pkgVideos} video{pkgVideos !== 1 ? 's' : ''}
                      {pkgDocs > 0 ? ` · ${pkgDocs} doc${pkgDocs !== 1 ? 's' : ''}` : ''}
                    </span>
                  </div>
                </div>
                {pkg.grade && (
                  <Button variant="outline" size="sm" asChild className="shrink-0">
                    <Link href={`/grades/${pkg.grade.slug}`}>View Grade</Link>
                  </Button>
                )}
              </div>

              <div className="divide-y divide-border/40">
                {pkg.chapters.map((ch: any) => {
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
                          {chVideos.map((v: any) => (
                            <VideoCard key={v.id} video={v} />
                          ))}
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

                {pkg.chapters.every((ch: any) =>
                  (videosByChapter[ch.id]?.length ?? 0) === 0 &&
                  (documentsByChapter[ch.id]?.length ?? 0) === 0
                ) && (
                  <div className="px-5 py-6 text-center">
                    <Video className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No content published in this package yet.</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

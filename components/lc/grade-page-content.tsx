'use client'

import { useState } from 'react'
import Link from 'next/link'
import { VideoCard } from '@/components/lc/video-card'
import { BuySubscribeDialog } from '@/components/lc/buy-subscribe-dialog'
import { StreamablePlayer } from '@/components/lc/streamable-player'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  ChevronDown, ChevronUp, FolderOpen, Video,
  Package, Lock, CheckCircle2, ShoppingCart, Play,
  FileText, Download, Radio,
} from 'lucide-react'

interface Chapter {
  id: string
  title: string
  description: string | null
  order_index: number
}

interface VideoRow {
  id: string
  title: string
  chapter_id: string | null
  [key: string]: any
}

interface DocumentRow {
  id: string
  title: string
  description: string | null
  chapter_id: string | null
  file_url: string
  file_name: string | null
}

interface SubscriptionPackage {
  id: string
  name: string
  description: string | null
  price: number
  chapterIds: string[]
}

interface Props {
  packages: SubscriptionPackage[]
  chapters: Chapter[]
  videosByChapter: Record<string, VideoRow[]>
  documentsByChapter: Record<string, DocumentRow[]>
  unchapteredVideos: VideoRow[]
  gradeColor: string
  gradeSlug: string
  subscribedVideoPackageIds: string[]
  isLoggedIn: boolean
  gradeName: string
  liveSubscriptionEnabled: boolean
  liveSubscriptionPrice: number
  liveMonthChapterIds?: string[]
  liveMonthLabel?: string
}

export function GradePageContent({
  packages,
  chapters,
  videosByChapter,
  documentsByChapter,
  unchapteredVideos,
  gradeColor,
  gradeSlug,
  subscribedVideoPackageIds,
  isLoggedIn,
  gradeName,
  liveSubscriptionEnabled,
  liveSubscriptionPrice,
  liveMonthChapterIds = [],
  liveMonthLabel,
}: Props) {
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({})
  const [demoModal, setDemoModal] = useState<{ videos: VideoRow[]; activeIdx: number } | null>(null)

  const liveChapters = chapters.filter((ch) => liveMonthChapterIds.includes(ch.id))

  function toggleChapter(key: string) {
    setOpenChapters((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const subscribedSet = new Set(subscribedVideoPackageIds)

  const dialogPackageList = packages.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    chapterCount: p.chapterIds.length,
  }))

  function renderChapterContent(ch: Chapter, chVideos: VideoRow[], chDocs: DocumentRow[]) {
    return (
      <div className="px-5 pb-5 pt-2 bg-muted/10">
        {ch.description && (
          <p className="text-sm text-muted-foreground mb-3">{ch.description}</p>
        )}
        {chVideos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
            {chVideos.map((v) => <VideoCard key={v.id} video={v} />)}
          </div>
        )}
        {chDocs.length > 0 && (
          <div className="space-y-2">
            {chDocs.map((doc) => (
              <a
                key={doc.id}
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card hover:bg-muted/30 transition-colors group"
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
        {chVideos.length === 0 && chDocs.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 py-8 text-center">
            <p className="text-sm text-muted-foreground">No content in this chapter yet.</p>
          </div>
        )}
      </div>
    )
  }

  const liveContentSection = liveChapters.length > 0 ? (
    <section className="mb-8">
      <h2 className="text-lg sm:text-xl font-semibold mb-5 flex items-center gap-2">
        <Radio className="w-5 h-5 text-primary" />
        Live Class Content{liveMonthLabel ? ` — ${liveMonthLabel}` : ''}
      </h2>
      <div className="space-y-4">
        {liveChapters.map((ch) => {
          const key = `live-${ch.id}`
          const isOpen = openChapters[key] ?? false
          const chVideos = videosByChapter[ch.id] ?? []
          const chDocs = documentsByChapter[ch.id] ?? []
          const itemCount = chVideos.length + chDocs.length
          return (
            <div key={ch.id} className="rounded-2xl border border-primary/20 overflow-hidden">
              <button
                onClick={() => toggleChapter(key)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors text-left bg-card"
              >
                <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                <span className="flex-1 font-semibold">{ch.title}</span>
                <span className="text-xs text-muted-foreground mr-2">
                  {itemCount} item{itemCount !== 1 ? 's' : ''}
                </span>
                {isOpen
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                }
              </button>
              {isOpen && renderChapterContent(ch, chVideos, chDocs)}
            </div>
          )
        })}
      </div>
    </section>
  ) : null

  if (packages.length > 0) {
    return (
      <>
        {liveContentSection}
      <div className="space-y-6">
        {packages.map((pkg) => {
          const isSubscribed = subscribedSet.has(pkg.id)
          const pkgChapters = chapters
            .filter((ch) => pkg.chapterIds.includes(ch.id))
            .sort((a, b) => a.order_index - b.order_index)

          const totalVideos = pkgChapters.reduce(
            (sum, ch) => sum + (videosByChapter[ch.id]?.length ?? 0), 0
          )
          const totalDocs = pkgChapters.reduce(
            (sum, ch) => sum + (documentsByChapter[ch.id]?.length ?? 0), 0
          )

          return (
            <div
              key={pkg.id}
              className={`rounded-2xl border overflow-hidden transition-colors ${
                isSubscribed ? 'border-primary/40 bg-card' : 'border-border/60 bg-card'
              }`}
            >
              <div className={`px-5 py-4 border-b border-border/60 flex items-start justify-between gap-4 ${
                isSubscribed ? 'bg-primary/5' : ''
              }`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Package className="w-4 h-4 text-primary shrink-0" />
                    <h3 className="font-bold text-base">{pkg.name}</h3>
                  </div>
                  {pkg.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">{pkg.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {pkgChapters.length} chapter{pkgChapters.length !== 1 ? 's' : ''}
                    {' · '}{totalVideos} video{totalVideos !== 1 ? 's' : ''}
                    {totalDocs > 0 ? ` · ${totalDocs} doc${totalDocs !== 1 ? 's' : ''}` : ''}
                    {' · '}Rs {pkg.price.toFixed(2)}
                  </p>
                </div>

                <div className="shrink-0 text-right flex flex-col items-end gap-2">
                  {isSubscribed ? (
                    <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Purchased
                    </span>
                  ) : isLoggedIn ? (
                    <BuySubscribeDialog
                      videoPackages={dialogPackageList}
                      mandatoryPackageId={pkg.id}
                      gradeName={gradeName}
                      liveSubscriptionPrice={liveSubscriptionPrice}
                      liveSubscriptionEnabled={liveSubscriptionEnabled}
                      defaultMode="video"
                      triggerLabel="Buy"
                      triggerSize="sm"
                      isLoggedIn={isLoggedIn}
                    />
                  ) : (
                    <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-accent">
                      <Link href="/login?redirectTo=/dashboard/subscriptions">
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Buy
                      </Link>
                    </Button>
                  )}
                </div>
              </div>

              <div className="divide-y divide-border/40">
                {pkgChapters.map((ch) => {
                  const key = `${pkg.id}-${ch.id}`
                  const isOpen = openChapters[key] ?? false
                  const chVideos = videosByChapter[ch.id] ?? []
                  const chDocs = documentsByChapter[ch.id] ?? []
                  const demoVideos = chVideos.filter((v) => v.is_demo)
                  const canAccess = isSubscribed
                  const itemCount = chVideos.length + chDocs.length

                  return (
                    <div key={ch.id}>
                      <button
                        onClick={() => canAccess && toggleChapter(key)}
                        className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors ${
                          canAccess ? 'hover:bg-muted/30 cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        {canAccess
                          ? <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                          : <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                        }
                        <span className="flex-1 font-medium text-sm">{ch.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {itemCount} item{itemCount !== 1 ? 's' : ''}
                        </span>
                        {canAccess ? (
                          isOpen
                            ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                            : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                        ) : demoVideos.length > 0 ? (
                          <span
                            role="button"
                            onClick={(e) => { e.stopPropagation(); setDemoModal({ videos: demoVideos, activeIdx: 0 }) }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-full px-2.5 py-1 transition-colors shrink-0"
                          >
                            <Play className="w-3 h-3 fill-primary" /> Play Demo
                          </span>
                        ) : null}
                      </button>

                      {canAccess && isOpen && renderChapterContent(ch, chVideos, chDocs)}
                    </div>
                  )
                })}

                {pkgChapters.length === 0 && (
                  <div className="px-5 py-6 text-center">
                    <p className="text-sm text-muted-foreground">No chapters linked to this package yet.</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {demoModal && (
          <Dialog open onOpenChange={() => setDemoModal(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{demoModal.videos[demoModal.activeIdx]?.title ?? 'Demo Video'}</DialogTitle>
              </DialogHeader>
              <StreamablePlayer
                url={demoModal.videos[demoModal.activeIdx]?.streamable_url ?? ''}
                title={demoModal.videos[demoModal.activeIdx]?.title}
              />
              {demoModal.videos.length > 1 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {demoModal.videos.map((v, i) => (
                    <button
                      key={v.id}
                      onClick={() => setDemoModal({ ...demoModal, activeIdx: i })}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        i === demoModal.activeIdx
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      {v.title}
                    </button>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}

        {unchapteredVideos.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Video className="w-4 h-4 text-muted-foreground shrink-0" />
              <h3 className="font-semibold text-base text-muted-foreground">Free Videos</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {unchapteredVideos.map((v) => <VideoCard key={v.id} video={v} />)}
            </div>
          </div>
        )}
      </div>
      </>
    )
  }

  return (
    <>
      {liveContentSection}
    <div className="space-y-4">
      {chapters.map((ch) => {
        const key = ch.id
        const isOpen = openChapters[key] ?? false
        const chVideos = videosByChapter[ch.id] ?? []

        return (
          <div key={ch.id} className="rounded-2xl border border-border/60 overflow-hidden">
            <button
              onClick={() => toggleChapter(key)}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors text-left bg-card"
            >
              <FolderOpen className="w-4 h-4 text-primary shrink-0" />
              <span className="flex-1 font-semibold">{ch.title}</span>
              <span className="text-xs text-muted-foreground mr-2">
                {chVideos.length} video{chVideos.length !== 1 ? 's' : ''}
              </span>
              {isOpen
                ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
              }
            </button>
            {isOpen && renderChapterContent(ch, chVideos, documentsByChapter[ch.id] ?? [])}
          </div>
        )
      })}

      {unchapteredVideos.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Video className="w-4 h-4 text-muted-foreground shrink-0" />
            <h3 className="font-semibold text-base text-muted-foreground">Other Videos</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {unchapteredVideos.map((v) => <VideoCard key={v.id} video={v} />)}
          </div>
        </div>
      )}
    </div>
    </>
  )
}

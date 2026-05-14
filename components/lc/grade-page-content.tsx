'use client'

import { useState } from 'react'
import { VideoCard } from '@/components/lc/video-card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp, FolderOpen, Video, Package } from 'lucide-react'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

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
  streamable_url: string
  thumbnail_url: string | null
  price: number
  is_free: boolean
  duration_minutes: number | null
  is_published: boolean
  grade?: any
  chapter?: any
}

interface SubscriptionPackage {
  id: string
  name: string
  description: string | null
  price: number
  month: number
  year: number
  chapterIds: string[]
}

interface Props {
  packages: SubscriptionPackage[]
  chapters: Chapter[]
  videosByChapter: Record<string, VideoRow[]>
  unchapteredVideos: VideoRow[]
  gradeColor: string
}

export function GradePageContent({
  packages,
  chapters,
  videosByChapter,
  unchapteredVideos,
  gradeColor,
}: Props) {
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({})

  function toggleChapter(key: string) {
    setOpenChapters((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const hasPackages = packages.length > 0

  if (hasPackages) {
    return (
      <div className="space-y-8">
        {packages.map((pkg) => {
          const pkgChapters = chapters
            .filter((ch) => pkg.chapterIds.includes(ch.id))
            .sort((a, b) => a.order_index - b.order_index)

          const totalVideos = pkgChapters.reduce(
            (sum, ch) => sum + (videosByChapter[ch.id]?.length ?? 0), 0
          )

          return (
            <div key={pkg.id} className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              {/* Package header */}
              <div className="px-5 py-4 border-b border-border/60 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Package className="w-4 h-4 text-primary shrink-0" />
                    <h3 className="font-bold text-base">{pkg.name}</h3>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {MONTHS[pkg.month - 1]} {pkg.year}
                    </Badge>
                  </div>
                  {pkg.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">{pkg.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {pkgChapters.length} chapter{pkgChapters.length !== 1 ? 's' : ''} · {totalVideos} video{totalVideos !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-bold text-primary">Rs {pkg.price.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">/ month</p>
                </div>
              </div>

              {/* Chapters inside this package */}
              <div className="divide-y divide-border/40">
                {pkgChapters.map((ch) => {
                  const key = `${pkg.id}-${ch.id}`
                  const isOpen = openChapters[key] ?? false
                  const chVideos = videosByChapter[ch.id] ?? []

                  return (
                    <div key={ch.id}>
                      <button
                        onClick={() => toggleChapter(key)}
                        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors text-left"
                      >
                        <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                        <span className="flex-1 font-medium text-sm">{ch.title}</span>
                        <span className="text-xs text-muted-foreground mr-2">
                          {chVideos.length} video{chVideos.length !== 1 ? 's' : ''}
                        </span>
                        {isOpen
                          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                        }
                      </button>

                      {isOpen && (
                        <div className="px-5 pb-5 pt-2 bg-muted/10">
                          {ch.description && (
                            <p className="text-sm text-muted-foreground mb-3">{ch.description}</p>
                          )}
                          {chVideos.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                              {chVideos.map((v) => (
                                <VideoCard key={v.id} video={v} />
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-border/60 py-8 text-center">
                              <p className="text-sm text-muted-foreground">No videos in this chapter yet.</p>
                            </div>
                          )}
                        </div>
                      )}
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

        {/* Unchaptered free videos below packages */}
        {unchapteredVideos.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Video className="w-4 h-4 text-muted-foreground shrink-0" />
              <h3 className="font-semibold text-base text-muted-foreground">Free Videos</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {unchapteredVideos.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // No packages — fall back to flat chapter/video layout
  return (
    <div className="space-y-10">
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
            {isOpen && (
              <div className="px-5 pb-5 pt-3 bg-muted/10">
                {ch.description && (
                  <p className="text-sm text-muted-foreground mb-3">{ch.description}</p>
                )}
                {chVideos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {chVideos.map((v) => <VideoCard key={v.id} video={v} />)}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/60 py-8 text-center">
                    <p className="text-sm text-muted-foreground">No videos in this chapter yet.</p>
                  </div>
                )}
              </div>
            )}
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
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronDown, ChevronUp, FolderOpen, Play, Clock,
  ListVideo, X, Package, Radio, FileText, BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export interface PlaylistVideo {
  id: string
  title: string
  duration_minutes: number | null
}

export interface PlaylistDocument {
  id: string
  title: string
  type: 'document' | 'revision_note'
  url: string
}

export interface PlaylistChapter {
  id: string
  title: string
  order_index: number
  videos: PlaylistVideo[]
  documents: PlaylistDocument[]
}

export interface PlaylistPackage {
  id: string
  name: string
  package_type: string
  month: number | null
  year: number | null
  chapters: PlaylistChapter[]
}

interface Props {
  playlist: PlaylistPackage[]
  currentVideoId: string
  isLiveContext: boolean
  gradeColor?: string
}

function totalItems(pkg: PlaylistPackage) {
  return pkg.chapters.reduce((n, ch) => n + ch.videos.length + ch.documents.length, 0)
}

function findLocation(playlist: PlaylistPackage[], videoId: string) {
  for (const pkg of playlist) {
    for (const ch of pkg.chapters) {
      if (ch.videos.some(v => v.id === videoId)) {
        return { pkgId: pkg.id, chapterId: ch.id }
      }
    }
  }
  return null
}

export function VideoPlaylist({ playlist, currentVideoId, isLiveContext, gradeColor }: Props) {
  const location = findLocation(playlist, currentVideoId)

  // Track which packages and chapters are open
  const [openPkgs, setOpenPkgs] = useState<Set<string>>(
    () => new Set(location ? [location.pkgId] : playlist.slice(0, 1).map(p => p.id))
  )
  const [openChapters, setOpenChapters] = useState<Set<string>>(
    () => new Set(location ? [location.chapterId] : [])
  )

  // Mobile: whether the full panel is visible
  const [mobileOpen, setMobileOpen] = useState(false)

  const totalCount = playlist.reduce((n, p) => n + totalItems(p), 0)

  function togglePkg(id: string) {
    setOpenPkgs(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleChapter(id: string) {
    setOpenChapters(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const panelContent = (
    <div className="space-y-1">
      {playlist.map(pkg => {
        const isPkgOpen = openPkgs.has(pkg.id)
        const count = totalItems(pkg)
        const isLive = pkg.package_type === 'live_month'

        return (
          <div key={pkg.id} className="rounded-lg overflow-hidden border border-border/60">
            {/* Package header */}
            <button
              onClick={() => togglePkg(pkg.id)}
              className="w-full flex items-center gap-2 px-3 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
            >
              {isLive
                ? <Radio className="w-3.5 h-3.5 text-primary shrink-0" />
                : <Package className="w-3.5 h-3.5 text-primary shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{pkg.name}</p>
                {isLive && pkg.month && pkg.year && (
                  <p className="text-xs text-muted-foreground">{MONTHS[pkg.month - 1]} {pkg.year}</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0 mr-1">{count}</span>
              {isPkgOpen
                ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              }
            </button>

            {isPkgOpen && (
              <div className="divide-y divide-border/20">
                {pkg.chapters.map(ch => {
                  const isChOpen = openChapters.has(ch.id)
                  const itemCount = ch.videos.length + ch.documents.length
                  return (
                    <div key={ch.id}>
                      {/* Chapter row */}
                      <button
                        onClick={() => toggleChapter(ch.id)}
                        className="w-full flex items-center gap-2 px-4 py-2 bg-muted/10 hover:bg-muted/30 transition-colors text-left"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="flex-1 text-sm font-medium truncate">{ch.title}</span>
                        <span className="text-xs text-muted-foreground shrink-0 mr-1">{itemCount}</span>
                        {isChOpen
                          ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        }
                      </button>

                      {isChOpen && (
                        <div>
                          {/* Videos */}
                          {ch.videos.map(v => {
                            const isCurrent = v.id === currentVideoId
                            const href = `/videos/${v.id}${isLiveContext ? '?live=1' : ''}`
                            return (
                              <Link
                                key={v.id}
                                href={href}
                                className={cn(
                                  'flex items-start gap-2.5 px-5 py-2.5 transition-colors group',
                                  isCurrent
                                    ? 'bg-primary/10 border-l-2 border-primary'
                                    : 'hover:bg-muted/30 border-l-2 border-transparent'
                                )}
                              >
                                <div className={cn(
                                  'w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                                  isCurrent
                                    ? 'bg-primary'
                                    : 'bg-muted/60 group-hover:bg-primary/20'
                                )}>
                                  <Play className={cn(
                                    'w-2.5 h-2.5 fill-current ml-0.5',
                                    isCurrent ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary'
                                  )} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={cn(
                                    'text-sm leading-snug line-clamp-2',
                                    isCurrent ? 'font-semibold text-primary' : 'font-medium group-hover:text-primary transition-colors'
                                  )}>
                                    {v.title}
                                  </p>
                                  {v.duration_minutes && (
                                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-0.5">
                                      <Clock className="w-3 h-3" />{v.duration_minutes} min
                                    </p>
                                  )}
                                </div>
                              </Link>
                            )
                          })}

                          {/* Documents & revision notes */}
                          {ch.documents.map(doc => (
                            <a
                              key={doc.id}
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-start gap-2.5 px-5 py-2.5 hover:bg-muted/30 border-l-2 border-transparent hover:border-primary/40 transition-colors group"
                            >
                              <div className="w-5 h-5 rounded-full bg-muted/60 group-hover:bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                {doc.type === 'revision_note'
                                  ? <BookOpen className="w-2.5 h-2.5 text-muted-foreground group-hover:text-primary" />
                                  : <FileText className="w-2.5 h-2.5 text-muted-foreground group-hover:text-primary" />
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                                  {doc.title}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {doc.type === 'revision_note' ? 'Revision Notes' : 'Document'}
                                </p>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <div className="hidden lg:flex flex-col w-[360px] shrink-0">
        <div className="sticky top-4 flex flex-col max-h-[calc(100vh-5rem)]">
          <div className="flex items-center gap-2 mb-3 px-0.5">
            <ListVideo className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Playlist</h2>
            <span className="ml-auto text-xs text-muted-foreground">{totalCount} videos</span>
          </div>
          <div className="overflow-y-auto flex-1 space-y-1 pr-0.5 scrollbar-thin">
            {panelContent}
          </div>
        </div>
      </div>

      {/* ── Mobile: sticky toggle bar + slide-down panel ── */}
      <div className="lg:hidden mt-4">
        <button
          onClick={() => setMobileOpen(o => !o)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
        >
          <ListVideo className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold flex-1 text-left">Playlist</span>
          <span className="text-xs text-muted-foreground mr-1">{totalCount} videos</span>
          {mobileOpen
            ? <X className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />
          }
        </button>

        {mobileOpen && (
          <div className="mt-2 max-h-[60vh] overflow-y-auto rounded-xl border border-border/60 p-2 bg-background">
            {panelContent}
          </div>
        )}
      </div>
    </>
  )
}

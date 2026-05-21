'use client'

import { useState } from 'react'
import { VideoCard } from '@/components/lc/video-card'
import { Badge } from '@/components/ui/badge'
import {
  Package, FolderOpen, FileText, Download,
  ChevronDown, ChevronUp, BookMarked, ExternalLink,
} from 'lucide-react'

interface Chapter {
  id: string
  title: string
  description: string | null
  order_index: number
}

interface VideoPackage {
  id: string
  name: string
  description: string | null
  chapters: Chapter[]
}

interface Props {
  packages: VideoPackage[]
  videosByChapter: Record<string, any[]>
  documentsByChapter: Record<string, any[]>
  notesByChapter?: Record<string, any[]>
  grade: { name: string; color: string }
}

function openNoteInNewTab(html: string, title: string) {
  const full = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title><style>body{font-family:system-ui,sans-serif;line-height:1.6;max-width:860px;margin:2rem auto;padding:0 1rem;}</style></head><body>${html}</body></html>`
  const url = URL.createObjectURL(new Blob([full], { type: 'text/html' }))
  const w = window.open(url, '_blank')
  if (w) setTimeout(() => URL.revokeObjectURL(url), 30000)
}

export function VideoPackagesAccordion({ packages, videosByChapter, documentsByChapter, notesByChapter = {}, grade }: Props) {
  const [openPackages, setOpenPackages] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(packages.map(p => [p.id, true]))
  )
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({})

  function togglePackage(id: string) {
    setOpenPackages(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function toggleChapter(id: string) {
    setOpenChapters(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="space-y-4">
      {packages.map(pkg => {
        const isPkgOpen = openPackages[pkg.id] ?? true
        const totalVideos = pkg.chapters.reduce((s, ch) => s + (videosByChapter[ch.id]?.length ?? 0), 0)
        const totalDocs = pkg.chapters.reduce((s, ch) => s + (documentsByChapter[ch.id]?.length ?? 0), 0)
        const totalNotes = pkg.chapters.reduce((s, ch) => s + (notesByChapter[ch.id]?.length ?? 0), 0)

        return (
          <div key={pkg.id} className="rounded-2xl border border-primary/20 overflow-hidden">
            {/* Package header — toggle */}
            <button
              onClick={() => togglePackage(pkg.id)}
              className="w-full px-5 py-4 bg-primary/5 border-b border-border/60 flex items-start justify-between gap-4 text-left hover:bg-primary/10 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Package className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-bold">{pkg.name}</span>
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
                    {pkg.chapters.length} chapter{pkg.chapters.length !== 1 ? 's' : ''}
                  </span>
                  {totalVideos > 0 && (
                    <span className="text-xs text-muted-foreground">
                      · {totalVideos} video{totalVideos !== 1 ? 's' : ''}
                    </span>
                  )}
                  {totalDocs > 0 && (
                    <span className="text-xs text-muted-foreground">
                      · {totalDocs} doc{totalDocs !== 1 ? 's' : ''}
                    </span>
                  )}
                  {totalNotes > 0 && (
                    <span className="text-xs text-muted-foreground">
                      · {totalNotes} note{totalNotes !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              {isPkgOpen
                ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
              }
            </button>

            {/* Package content */}
            {isPkgOpen && (
              <div className="divide-y divide-border/40">
                {pkg.chapters.map(ch => {
                  const chVideos = videosByChapter[ch.id] ?? []
                  const chDocs = documentsByChapter[ch.id] ?? []
                  const chNotes = notesByChapter[ch.id] ?? []
                  if (chVideos.length === 0 && chDocs.length === 0 && chNotes.length === 0) return null
                  const isChOpen = openChapters[ch.id] ?? false

                  return (
                    <div key={ch.id}>
                      <button
                        onClick={() => toggleChapter(ch.id)}
                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors text-left"
                      >
                        <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                        <span className="flex-1 font-semibold text-sm">{ch.title}</span>
                        <span className="text-xs text-muted-foreground mr-1">
                          {chVideos.length + chDocs.length + chNotes.length} item{(chVideos.length + chDocs.length + chNotes.length) !== 1 ? 's' : ''}
                        </span>
                        {isChOpen
                          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                        }
                      </button>
                      {isChOpen && (
                        <div className="px-5 pb-4 pt-2 bg-muted/10">
                          {ch.description && (
                            <p className="text-sm text-muted-foreground mb-3">{ch.description}</p>
                          )}
                          {chVideos.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-3">
                              {chVideos.map((v: any) => <VideoCard key={v.id} video={v} owned />)}
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
                          {chNotes.length > 0 && (
                            <div className="space-y-2 mt-2">
                              {chNotes.map((note: any) => (
                                <button
                                  key={note.id}
                                  onClick={() => openNoteInNewTab(note.content ?? '', note.title)}
                                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/20 hover:bg-violet-100 dark:hover:bg-violet-950/40 transition-colors text-left"
                                >
                                  <BookMarked className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
                                  <span className="flex-1 font-medium text-sm text-violet-700 dark:text-violet-300 truncate">{note.title}</span>
                                  <ExternalLink className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
                {pkg.chapters.every(ch =>
                  (videosByChapter[ch.id]?.length ?? 0) === 0 &&
                  (documentsByChapter[ch.id]?.length ?? 0) === 0 &&
                  (notesByChapter[ch.id]?.length ?? 0) === 0
                ) && (
                  <div className="px-5 py-6 text-center">
                    <p className="text-sm text-muted-foreground">No content published in this package yet.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

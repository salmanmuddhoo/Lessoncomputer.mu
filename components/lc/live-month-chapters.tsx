'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FolderOpen, ChevronDown, ChevronUp, FileText, Download, Play, BookMarked, ExternalLink } from 'lucide-react'

interface Chapter {
  id: string
  title: string
  description: string | null
  order_index: number
}

interface Props {
  chapters: Chapter[]
  videosByChapter: Record<string, any[]>
  documentsByChapter: Record<string, any[]>
  notesByChapter?: Record<string, any[]>
}

export function LiveMonthChapters({ chapters, videosByChapter, documentsByChapter, notesByChapter = {} }: Props) {
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({})

  function toggle(id: string) {
    setOpenChapters((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  if (chapters.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No chapters assigned to this month yet.
      </p>
    )
  }

  return (
    <div className="space-y-2 mt-4">
      {chapters.map((ch) => {
        const isOpen = openChapters[ch.id] ?? false
        const chVideos = videosByChapter[ch.id] ?? []
        const chDocs = documentsByChapter[ch.id] ?? []
        const chNotes = notesByChapter[ch.id] ?? []
        const itemCount = chVideos.length + chDocs.length + chNotes.length

        return (
          <div key={ch.id} className="rounded-xl border border-border/60 overflow-hidden">
            <button
              onClick={() => toggle(ch.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
            >
              <FolderOpen className="w-4 h-4 text-primary shrink-0" />
              <span className="flex-1 font-medium text-sm">{ch.title}</span>
              <span className="text-xs text-muted-foreground mr-1">
                {itemCount} item{itemCount !== 1 ? 's' : ''}
              </span>
              {isOpen
                ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
              }
            </button>
            {isOpen && (
              <div className="px-4 pb-4 pt-2 bg-muted/10">
                {ch.description && (
                  <p className="text-sm text-muted-foreground mb-3">{ch.description}</p>
                )}
                {chVideos.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {chVideos.map((v: any) => (
                      <Link
                        key={v.id}
                        href={`/videos/${v.id}?live=1`}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                          <Play className="w-3.5 h-3.5 text-primary fill-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{v.title}</p>
                          {v.duration_minutes && (
                            <p className="text-xs text-muted-foreground">{v.duration_minutes} min</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {chDocs.length > 0 && (
                  <div className="space-y-2">
                    {chDocs.map((doc: any) => (
                      <a
                        key={doc.id}
                        href={doc.file_url_live || doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors group"
                      >
                        <FileText className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                        <span className="flex-1 text-sm font-medium text-red-700 dark:text-red-300 truncate">{doc.title}</span>
                        <Download className="w-3.5 h-3.5 text-red-400 group-hover:text-red-600 dark:group-hover:text-red-300 transition-colors shrink-0" />
                      </a>
                    ))}
                  </div>
                )}
                {chNotes.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {chNotes.map((note: any) => {
                      const hasContent = !!(note.content_live || note.content)
                      if (!hasContent) return null
                      const isLive = !!note.content_live
                      return (
                        <a
                          key={note.id}
                          href={`/api/notes/${note.id}${isLive ? '?live=1' : ''}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/20 hover:bg-violet-100 dark:hover:bg-violet-950/40 transition-colors"
                        >
                          <BookMarked className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
                          <span className="flex-1 font-medium text-sm text-violet-700 dark:text-violet-300 truncate">{note.title}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                        </a>
                      )
                    })}
                  </div>
                )}
                {chVideos.length === 0 && chDocs.length === 0 && chNotes.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No content in this chapter yet.
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

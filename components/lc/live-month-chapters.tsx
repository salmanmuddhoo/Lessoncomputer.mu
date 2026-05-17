'use client'

import { useState } from 'react'
import { VideoCard } from '@/components/lc/video-card'
import { FolderOpen, ChevronDown, ChevronUp, FileText, Download } from 'lucide-react'

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
}

export function LiveMonthChapters({ chapters, videosByChapter, documentsByChapter }: Props) {
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
        const itemCount = chVideos.length + chDocs.length

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
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-3">
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
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                        <span className="flex-1 text-sm font-medium truncate">{doc.title}</span>
                        <Download className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </a>
                    ))}
                  </div>
                )}
                {chVideos.length === 0 && chDocs.length === 0 && (
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

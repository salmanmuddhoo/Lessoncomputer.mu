'use client'

import { useState } from 'react'
import { PlayCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { StreamablePlayer } from '@/components/lc/streamable-player'

interface DemoVideo {
  id: string
  title: string
  streamable_url: string
}

interface Props {
  videos: DemoVideo[]
}

// A single, prominent entry point to a grade's free preview videos — works the same
// whether the student is here for live classes or video packages, since neither
// requires a subscription to watch a demo.
export function DemoVideosButton({ videos }: Props) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null)

  if (videos.length === 0) return null

  return (
    <>
      <button
        onClick={() => setActiveIdx(0)}
        className="mb-6 w-full sm:w-auto inline-flex items-center gap-3 px-5 py-3.5 rounded-xl bg-primary/10 border border-primary/30 hover:bg-primary/15 hover:border-primary/50 transition-colors text-left"
      >
        <span className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
          <PlayCircle className="w-5 h-5 text-primary-foreground" />
        </span>
        <span>
          <span className="block text-sm font-semibold text-foreground">Watch Demo Videos</span>
          <span className="block text-xs text-muted-foreground">
            {videos.length} free preview {videos.length === 1 ? 'lesson' : 'lessons'} — no subscription needed
          </span>
        </span>
      </button>

      {activeIdx !== null && (
        <Dialog open onOpenChange={() => setActiveIdx(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{videos[activeIdx]?.title ?? 'Demo Video'}</DialogTitle>
            </DialogHeader>
            <StreamablePlayer
              url={videos[activeIdx]?.streamable_url ?? ''}
              title={videos[activeIdx]?.title}
            />
            {videos.length > 1 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {videos.map((v, i) => (
                  <button
                    key={v.id}
                    onClick={() => setActiveIdx(i)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      i === activeIdx
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
    </>
  )
}

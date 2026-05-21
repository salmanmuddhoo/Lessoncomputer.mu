'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Megaphone, Users, Radio, Video, FolderOpen } from 'lucide-react'

const AUDIENCE_META: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  all:   { label: 'All Students',   icon: Users,  className: 'bg-primary/10 text-primary border-primary/20' },
  live:  { label: 'Live Classes',   icon: Radio,  className: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800' },
  video: { label: 'Video Packages', icon: Video,  className: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-800' },
}

interface Broadcast {
  id: string
  title: string
  body: string
  target_audience: string
  created_at: string
  chapter_id: string | null
  chapter: { title: string } | null
}

interface Props {
  items: Broadcast[]
}

export function NoticesList({ items }: Props) {
  const [selected, setSelected] = useState<Broadcast | null>(null)

  // Group by chapter; "General" last for items with no chapter
  const chapterMap = new Map<string, { key: string; title: string; items: Broadcast[] }>()
  for (const item of items) {
    const key = item.chapter_id ?? '__general__'
    if (!chapterMap.has(key)) {
      chapterMap.set(key, {
        key,
        title: item.chapter?.title ?? 'General',
        items: [],
      })
    }
    chapterMap.get(key)!.items.push(item)
  }

  // Sort: chapter groups first (by first occurrence), General last
  const groups = Array.from(chapterMap.values()).sort((a, b) => {
    if (a.key === '__general__') return 1
    if (b.key === '__general__') return -1
    return 0
  })

  return (
    <>
      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.key}>
            <div className="flex items-center gap-2 mb-3">
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-muted-foreground">{group.title}</h2>
              <div className="flex-1 h-px bg-border/60" />
            </div>
            <div className="space-y-2">
              {group.items.map((item) => {
                const meta = AUDIENCE_META[item.target_audience] ?? AUDIENCE_META.all
                const Icon = meta.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelected(item)}
                    className="w-full text-left rounded-xl border border-border/60 p-4 hover:border-primary/30 hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Megaphone className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm">{item.title}</h3>
                          <Badge variant="outline" className={`gap-1 text-[10px] px-1.5 py-0 h-4 ${meta.className}`}>
                            <Icon className="w-2.5 h-2.5" />
                            {meta.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{item.body}</p>
                        <p className="text-[11px] text-muted-foreground mt-2">
                          {new Date(item.created_at).toLocaleDateString('en-GB', { dateStyle: 'long' })}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        {selected && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base leading-snug">{selected.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div className="flex flex-wrap items-center gap-2">
                {(() => {
                  const meta = AUDIENCE_META[selected.target_audience] ?? AUDIENCE_META.all
                  const Icon = meta.icon
                  return (
                    <Badge variant="outline" className={`gap-1 text-xs ${meta.className}`}>
                      <Icon className="w-3 h-3" />
                      {meta.label}
                    </Badge>
                  )
                })()}
                {selected.chapter && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FolderOpen className="w-3 h-3" />
                    {selected.chapter.title}
                  </span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(selected.created_at).toLocaleDateString('en-GB', { dateStyle: 'long' })}
                </span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">{selected.body}</p>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}

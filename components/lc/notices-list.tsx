'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Megaphone, Users, Radio, Video, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react'

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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  function toggleGroup(key: string) {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Group by chapter; "General" last
  const chapterMap = new Map<string, { key: string; title: string; items: Broadcast[] }>()
  for (const item of items) {
    const key = item.chapter_id ?? '__general__'
    if (!chapterMap.has(key)) {
      chapterMap.set(key, { key, title: item.chapter?.title ?? 'General', items: [] })
    }
    chapterMap.get(key)!.items.push(item)
  }

  const groups = Array.from(chapterMap.values()).sort((a, b) => {
    if (a.key === '__general__') return 1
    if (b.key === '__general__') return -1
    return 0
  })

  return (
    <>
      <div className="space-y-2">
        {groups.map((group) => {
          const isOpen = openGroups[group.key] ?? false
          return (
            <div key={group.key} className="rounded-xl border border-border/60 overflow-hidden">
              {/* Folder header — toggles the group */}
              <button
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
              >
                {isOpen
                  ? <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                  : <Folder className="w-4 h-4 text-muted-foreground shrink-0" />}
                <span className="flex-1 font-medium text-sm">{group.title}</span>
                <span className="text-xs text-muted-foreground mr-1">
                  {group.items.length} message{group.items.length !== 1 ? 's' : ''}
                </span>
                {isOpen
                  ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
              </button>

              {/* Messages inside the folder */}
              {isOpen && (
                <div className="border-t border-border/40 divide-y divide-border/30">
                  {group.items.map((item) => {
                    const meta = AUDIENCE_META[item.target_audience] ?? AUDIENCE_META.all
                    const Icon = meta.icon
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelected(item)}
                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors text-left"
                      >
                        <Megaphone className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="flex-1 text-sm font-medium truncate">{item.title}</span>
                        <Badge variant="outline" className={`gap-1 text-[10px] px-1.5 py-0 h-4 shrink-0 ${meta.className}`}>
                          <Icon className="w-2.5 h-2.5" />
                          {meta.label}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap ml-1 shrink-0">
                          {new Date(item.created_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
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

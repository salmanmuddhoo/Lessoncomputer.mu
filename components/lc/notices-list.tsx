'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Megaphone, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react'

interface Broadcast {
  id: string
  title: string
  body: string
  target_audience: string
  created_at: string
  chapter_id: string | null
  chapter: { title: string } | null
  grade_id?: string | null
  grade?: { id: string; name: string } | null
}

interface Props {
  items: Broadcast[]
  unreadIds?: string[]
  studentId: string
}

export function NoticesList({ items, unreadIds = [], studentId }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Broadcast | null>(null)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [unread, setUnread] = useState<Set<string>>(() => new Set(unreadIds))
  const [gradeFilter, setGradeFilter] = useState<string>('all')

  function toggleGroup(key: string) {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Distinct grades present across the messages — a student in more than one grade can
  // filter to a single grade's messages.
  const gradeOptions = Array.from(
    new Map(items.filter((i) => i.grade?.id).map((i) => [i.grade!.id, i.grade!])).values()
  ).sort((a, b) => a.name.localeCompare(b.name))
  const visibleItems = gradeFilter === 'all' ? items : items.filter((i) => i.grade_id === gradeFilter)

  // Open a message and, if it was unread for THIS student, mark it read (per-student
  // via broadcast_reads). Other students keep their own unread state.
  async function openMessage(item: Broadcast) {
    setSelected(item)
    if (!unread.has(item.id)) return
    setUnread((prev) => { const next = new Set(prev); next.delete(item.id); return next })
    try {
      const supabase = createClient()
      await (supabase as any)
        .from('broadcast_reads')
        .upsert({ student_id: studentId, broadcast_id: item.id }, { onConflict: 'student_id,broadcast_id' })
      router.refresh() // update the sidebar unread badge
    } catch {
      /* best-effort — badge will reconcile on next load */
    }
  }

  // Group by chapter; "General" last
  const chapterMap = new Map<string, { key: string; title: string; items: Broadcast[] }>()
  for (const item of visibleItems) {
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
      {gradeOptions.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setGradeFilter('all')}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${gradeFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}
          >
            All grades
          </button>
          {gradeOptions.map((g) => (
            <button
              key={g.id}
              onClick={() => setGradeFilter(g.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${gradeFilter === g.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}
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
                {(() => {
                  const groupUnread = group.items.filter((i) => unread.has(i.id)).length
                  return groupUnread > 0 ? (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none mr-1">
                      {groupUnread}
                    </span>
                  ) : null
                })()}
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
                    const isUnread = unread.has(item.id)
                    return (
                      <button
                        key={item.id}
                        onClick={() => openMessage(item)}
                        className={`w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors text-left ${isUnread ? 'bg-primary/5' : ''}`}
                      >
                        {isUnread
                          ? <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" aria-label="Unread" />
                          : <Megaphone className="w-3.5 h-3.5 text-primary shrink-0" />}
                        <span className={`flex-1 text-sm truncate ${isUnread ? 'font-bold' : 'font-medium'}`}>{item.title}</span>
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

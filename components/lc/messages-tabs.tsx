'use client'

import { useState, type ReactNode } from 'react'
import { Megaphone, Mail } from 'lucide-react'

interface Props {
  announcements: ReactNode
  contact: ReactNode
  unreadAnnouncements?: number
  unreadReplies?: number
}

export function MessagesTabs({ announcements, contact, unreadAnnouncements = 0, unreadReplies = 0 }: Props) {
  const [tab, setTab] = useState<'announcements' | 'contact'>('announcements')

  return (
    <div>
      <div className="flex items-center gap-1 mb-6 border-b border-border/60">
        <button
          onClick={() => setTab('announcements')}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'announcements' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Megaphone className="w-3.5 h-3.5" /> Announcements
            {unreadAnnouncements > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{unreadAnnouncements}</span>
            )}
          </span>
        </button>
        <button
          onClick={() => setTab('contact')}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'contact' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" /> Contact Admin
            {unreadReplies > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{unreadReplies}</span>
            )}
          </span>
        </button>
      </div>

      <div hidden={tab !== 'announcements'}>{announcements}</div>
      <div hidden={tab !== 'contact'}>{contact}</div>
    </div>
  )
}

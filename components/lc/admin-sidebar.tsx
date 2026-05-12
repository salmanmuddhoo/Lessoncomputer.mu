'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Video, Users, BookOpen, GraduationCap,
  LogOut, Settings, ChevronRight, Radio,
} from 'lucide-react'
import { Logo } from '@/components/lc/logo'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, exact: true },
  { label: 'Videos', href: '/admin/videos', icon: Video },
  { label: 'Live Classes', href: '/admin/live-classes', icon: Radio },
  { label: 'Grades', href: '/admin/grades', icon: BookOpen },
  { label: 'Students', href: '/admin/students', icon: Users },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-64 shrink-0 flex flex-col h-screen sticky top-0 bg-sidebar border-r border-sidebar-border">
      <div className="p-5 border-b border-sidebar-border">
        <Logo size="sm" />
        <span className="text-xs text-muted-foreground mt-1 block">Admin Panel</span>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive(item.href, item.exact)
                ? 'bg-primary text-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent'
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
            {isActive(item.href, item.exact) && (
              <ChevronRight className="w-3 h-3 ml-auto" />
            )}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-0.5">
        <Link
          href="/admin/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}

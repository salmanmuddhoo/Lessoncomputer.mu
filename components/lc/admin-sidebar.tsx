'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Video, Users, BookOpen,
  LogOut, Settings, ChevronRight, ChevronDown, Radio, Menu, X, Package, CalendarDays,
  BarChart2, ClipboardList, Megaphone,
} from 'lucide-react'
import { Logo } from '@/components/lc/logo'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Dashboard',    href: '/admin',              icon: LayoutDashboard, exact: true },
  { label: 'Tuition',       href: '/admin/videos',       icon: Video },
  { label: 'Live Classes', href: '/admin/live-classes', icon: Radio },
  { label: 'Grades',       href: '/admin/grades',       icon: BookOpen },
  { label: 'Students',       href: '/admin/students',       icon: Users },
  { label: 'Subscriptions', href: '/admin/subscriptions', icon: Package },
  { label: 'Live Months',   href: '/admin/live-months',  icon: CalendarDays },
  { label: 'Messages',      href: '/admin/broadcasts',    icon: Megaphone },
]

const REPORT_ITEMS = [
  { label: 'Attendance', href: '/admin/reports/attendance', icon: ClipboardList },
]

function NavContent({ onNav }: { onNav?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const [reportsOpen, setReportsOpen] = useState(() => pathname.startsWith('/admin/reports'))

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNav}
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

        {/* Reports group */}
        <div>
          <button
            onClick={() => setReportsOpen((o) => !o)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive('/admin/reports')
                ? 'bg-primary/10 text-primary'
                : 'text-sidebar-foreground hover:bg-sidebar-accent'
            )}
          >
            <BarChart2 className="w-4 h-4 shrink-0" />
            Reports
            {reportsOpen
              ? <ChevronDown className="w-3 h-3 ml-auto" />
              : <ChevronRight className="w-3 h-3 ml-auto" />
            }
          </button>
          {reportsOpen && (
            <div className="ml-5 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
              {REPORT_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNav}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  )}
                >
                  <item.icon className="w-3.5 h-3.5 shrink-0" />
                  {item.label}
                  {isActive(item.href) && <ChevronRight className="w-3 h-3 ml-auto" />}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-0.5">
        <Link
          href="/admin/settings"
          onClick={onNav}
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
    </>
  )
}

export function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col h-full bg-sidebar border-r border-sidebar-border">
        <div className="p-5 border-b border-sidebar-border">
          <Logo size="sm" />
          <span className="text-xs text-muted-foreground mt-1 block">Admin Panel</span>
        </div>
        <NavContent />
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4">
        <Logo size="sm" />
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] flex flex-col h-full bg-sidebar border-r border-sidebar-border shadow-xl">
            <div className="p-5 border-b border-sidebar-border flex items-center justify-between">
              <div>
                <Logo size="sm" />
                <span className="text-xs text-muted-foreground mt-1 block">Admin Panel</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <NavContent onNav={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  )
}

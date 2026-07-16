'use client'

import { useState, useEffect, type ElementType } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Video, Users, BookOpen,
  LogOut, Settings, ChevronRight, ChevronDown, Radio, Menu, X, Package, CalendarDays,
  BarChart2, ClipboardList, Megaphone, UserCheck, CreditCard, Newspaper, Landmark, MessageSquareQuote, GraduationCap,
} from 'lucide-react'
import { Logo } from '@/components/lc/logo'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

type NavLink = { type: 'link'; label: string; href: string; icon: ElementType; exact?: boolean }
type NavGroup = { type: 'group'; label: string; icon: ElementType; items: { label: string; href: string; icon: ElementType }[] }
type NavEntry = NavLink | NavGroup

const NAV: NavEntry[] = [
  { type: 'link', label: 'Dashboard', href: '/admin', icon: LayoutDashboard, exact: true },
  { type: 'group', label: 'Tuition Setup', icon: GraduationCap, items: [
    { label: 'Tuition Content', href: '/admin/videos',        icon: Video },
    { label: 'Live Classes',    href: '/admin/live-classes',  icon: Radio },
    { label: 'Grades',          href: '/admin/grades',        icon: BookOpen },
    { label: 'Monthly Content', href: '/admin/live-months',   icon: CalendarDays },
    { label: 'Video Packages',  href: '/admin/subscriptions', icon: Package },
  ] },
  { type: 'link', label: 'Students',     href: '/admin/students',     icon: Users },
  { type: 'link', label: 'Messages',     href: '/admin/broadcasts',   icon: Megaphone },
  { type: 'link', label: 'Attendance',   href: '/admin/attendance',   icon: UserCheck },
  { type: 'link', label: 'Finance',      href: '/admin/finance',      icon: Landmark },
  { type: 'group', label: 'Reports', icon: BarChart2, items: [
    { label: 'Attendance',        href: '/admin/reports/attendance',         icon: ClipboardList },
    { label: 'Payments',          href: '/admin/payments',                   icon: CreditCard },
    { label: 'Live Subscriptions', href: '/admin/reports/live-subscriptions', icon: Radio },
  ] },
  { type: 'link', label: 'Blog',         href: '/admin/blog',         icon: Newspaper },
  { type: 'link', label: 'Testimonials', href: '/admin/testimonials', icon: MessageSquareQuote },
]

// Unread admin notifications (e.g. subscription cancellations) shown as a badge on
// the Messages menu. Refetches on navigation, window focus, and every 60s.
function useUnreadNotificationCount() {
  const [count, setCount] = useState(0)
  const pathname = usePathname()
  useEffect(() => {
    let active = true
    const supabase = createClient()
    async function fetchCount() {
      const { count: c } = await (supabase as any)
        .from('admin_notifications')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null)
      if (active && typeof c === 'number') setCount(c)
    }
    fetchCount()
    const interval = setInterval(fetchCount, 60_000)
    const onFocus = () => fetchCount()
    window.addEventListener('focus', onFocus)
    return () => { active = false; clearInterval(interval); window.removeEventListener('focus', onFocus) }
  }, [pathname])
  return count
}

function NavContent({ onNav, unreadCount = 0 }: { onNav?: () => void; unreadCount?: number }) {
  const pathname = usePathname()
  const router = useRouter()

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }
  const groupActive = (g: NavGroup) => g.items.some((it) => pathname.startsWith(it.href))

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const e of NAV) if (e.type === 'group') init[e.label] = groupActive(e)
    return init
  })
  const toggleGroup = (label: string) => setOpenGroups((p) => ({ ...p, [label]: !p[label] }))

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map((entry) => {
          if (entry.type === 'link') {
            return (
              <Link
                key={entry.href}
                href={entry.href}
                onClick={onNav}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive(entry.href, entry.exact)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <entry.icon className="w-4 h-4 shrink-0" />
                {entry.label}
                {entry.href === '/admin/broadcasts' && unreadCount > 0 ? (
                  <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                ) : isActive(entry.href, entry.exact) ? (
                  <ChevronRight className="w-3 h-3 ml-auto" />
                ) : null}
              </Link>
            )
          }

          const open = openGroups[entry.label] ?? false
          return (
            <div key={entry.label}>
              <button
                onClick={() => toggleGroup(entry.label)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  groupActive(entry) ? 'bg-primary/10 text-primary' : 'text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <entry.icon className="w-4 h-4 shrink-0" />
                {entry.label}
                {open ? <ChevronDown className="w-3 h-3 ml-auto" /> : <ChevronRight className="w-3 h-3 ml-auto" />}
              </button>
              {open && (
                <div className="ml-5 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
                  {entry.items.map((item) => (
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
          )
        })}
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
  const unreadCount = useUnreadNotificationCount()

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col h-full bg-sidebar border-r border-sidebar-border">
        <div className="p-5 border-b border-sidebar-border">
          <Logo size="sm" onDark />
          <span className="text-xs text-muted-foreground mt-1 block">Admin Panel</span>
        </div>
        <NavContent unreadCount={unreadCount} />
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4">
        <Logo size="sm" onDark />
        <button
          onClick={() => setMobileOpen(true)}
          className="relative p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          aria-label={unreadCount > 0 ? `Open menu (${unreadCount} unread)` : 'Open menu'}
        >
          <Menu className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] flex flex-col h-full bg-sidebar border-r border-sidebar-border shadow-xl">
            <div className="p-5 border-b border-sidebar-border flex items-center justify-between">
              <div>
                <Logo size="sm" onDark />
                <span className="text-xs text-muted-foreground mt-1 block">Admin Panel</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <NavContent onNav={() => setMobileOpen(false)} unreadCount={unreadCount} />
          </aside>
        </div>
      )}
    </>
  )
}

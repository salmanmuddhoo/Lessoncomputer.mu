'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, BookOpen, LogOut,
  ChevronRight, User, Menu, X, Package,
} from 'lucide-react'
import { Logo } from '@/components/lc/logo'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface StudentSidebarProps {
  userName?: string | null
  gradeName?: string | null
  hasLiveSubscription?: boolean
  hasVideoSubscription?: boolean
}

function NavContent({ userName, gradeName, hasLiveSubscription, hasVideoSubscription, onNav }: StudentSidebarProps & { onNav?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()

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

  const navItems = [
    { label: 'Dashboard',         href: '/dashboard',              icon: LayoutDashboard, exact: true, show: true },
    { label: 'My Video Packages', href: '/dashboard/my-videos',   icon: BookOpen,         show: hasVideoSubscription },
    { label: 'Live Classes',      href: '/dashboard/live-classes', icon: Users,            show: hasLiveSubscription },
    { label: 'Subscriptions',     href: '/dashboard/subscriptions',icon: Package,          show: true },
    { label: 'My Account',        href: '/dashboard/account',      icon: User,             show: true },
  ]

  return (
    <>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.filter((item) => item.show).map((item) => (
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
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        {gradeName && (
          <p className="text-xs text-muted-foreground px-3 pb-2 truncate">Grade: {gradeName}</p>
        )}
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

export function StudentSidebar({ userName, gradeName, hasLiveSubscription, hasVideoSubscription }: StudentSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col h-full bg-sidebar border-r border-sidebar-border">
        <div className="p-5 border-b border-sidebar-border">
          <Logo size="sm" />
          {userName && (
            <p className="text-xs text-muted-foreground mt-1 truncate">Hi, {userName.split(' ')[0]}</p>
          )}
        </div>
        <NavContent userName={userName} gradeName={gradeName} hasLiveSubscription={hasLiveSubscription} hasVideoSubscription={hasVideoSubscription} />
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4">
        <div>
          <Logo size="sm" />
        </div>
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
                {userName && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">Hi, {userName.split(' ')[0]}</p>
                )}
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <NavContent userName={userName} gradeName={gradeName} hasLiveSubscription={hasLiveSubscription} hasVideoSubscription={hasVideoSubscription} onNav={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  )
}

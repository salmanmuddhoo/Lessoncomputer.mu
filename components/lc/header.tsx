'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { Menu, X, ChevronDown, LogOut } from 'lucide-react'
import { ThemeToggle } from '@/components/lc/theme-toggle'
import { Logo } from '@/components/lc/logo'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

// Fallback if no grades are passed (e.g. before the list loads / on error).
const DEFAULT_GRADES: { name: string; slug: string }[] = []

interface HeaderProps {
  user?: { email?: string; role?: string } | null
  grades?: { name: string; slug: string }[]
}

export function Header({ user, grades }: HeaderProps) {
  const gradeList = grades && grades.length > 0 ? grades : DEFAULT_GRADES
  const [mobileOpen, setMobileOpen] = useState(false)
  const [gradesOpen, setGradesOpen] = useState(false)
  const gradesRef = useRef<HTMLDivElement>(null)

  // Close the desktop Grades dropdown on any click outside it (anywhere on the page).
  useEffect(() => {
    if (!gradesOpen) return
    function onDocClick(e: MouseEvent) {
      if (gradesRef.current && !gradesRef.current.contains(e.target as Node)) {
        setGradesOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [gradesOpen])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">

          {/* Logo */}
          <Logo />

          {/* Desktop nav — centred, DM Sans, like Boty */}
          <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            <Link href="/" className="px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground lc-transition rounded-lg hover:bg-secondary">
              Home
            </Link>

            {/* Grades dropdown — click-based; closes on any outside click (see effect) */}
            <div className="relative" ref={gradesRef}>
              <button
                onClick={() => setGradesOpen((v) => !v)}
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground lc-transition rounded-lg hover:bg-secondary"
              >
                Grades <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${gradesOpen ? 'rotate-180' : ''}`} />
              </button>
              {gradesOpen && gradeList.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-44 bg-card border border-border rounded-xl lc-shadow py-1.5 animate-scale-fade-in z-20 max-h-[70vh] overflow-y-auto">
                  {gradeList.map((g) => (
                    <Link
                      key={g.slug}
                      href={`/grades/${g.slug}`}
                      onClick={() => setGradesOpen(false)}
                      className="block px-4 py-2 text-sm text-foreground/70 hover:text-foreground hover:bg-secondary lc-transition"
                    >
                      {g.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link href="/about" className="px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground lc-transition rounded-lg hover:bg-secondary">
              About
            </Link>

            <Link href="/blog" className="px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground lc-transition rounded-lg hover:bg-secondary">
              Blog
            </Link>
          </nav>

          {/* Desktop auth — right side */}
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle className="text-muted-foreground hover:text-foreground" />
            {user ? (
              <>
                <Button asChild size="sm" className="bg-foreground text-background hover:bg-foreground/90 font-medium rounded-full px-5">
                  <Link href={user.role === 'admin' ? '/admin' : '/dashboard'}>Dashboard</Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
                  <LogOut className="w-4 h-4 mr-1" /> Sign out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" className="px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground lc-transition">Sign in</Link>
                <Button size="sm" asChild className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-full px-5">
                  <Link href="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile actions */}
          <div className="md:hidden flex items-center gap-1">
            <ThemeToggle className="text-muted-foreground hover:text-foreground" />
            <button
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary lc-transition"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card animate-scale-fade-in">
          <div className="px-5 py-5 space-y-1">
            {[{ label: 'Home', href: '/' }, { label: 'About', href: '/about' }, { label: 'Blog', href: '/blog' }].map((item) => (
              <Link key={item.href} href={item.href} className="block px-3 py-2.5 text-sm font-medium hover:bg-secondary rounded-xl lc-transition" onClick={() => setMobileOpen(false)}>
                {item.label}
              </Link>
            ))}
            {gradeList.length > 0 && (
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-3 pt-3 pb-1">Grades</p>
            )}
            {gradeList.map((g) => (
              <Link key={g.slug} href={`/grades/${g.slug}`} className="block px-3 py-2.5 text-sm hover:bg-secondary rounded-xl lc-transition" onClick={() => setMobileOpen(false)}>
                {g.name}
              </Link>
            ))}
            <div className="border-t border-border my-3 pt-3 flex gap-2">
              {user ? (
                <>
                  <Button asChild size="sm" className="flex-1 rounded-full bg-foreground text-background hover:bg-foreground/90">
                    <Link href={user.role === 'admin' ? '/admin' : '/dashboard'} onClick={() => setMobileOpen(false)}>Dashboard</Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSignOut} className="rounded-full">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" asChild className="flex-1 rounded-full">
                    <Link href="/login" onClick={() => setMobileOpen(false)}>Sign in</Link>
                  </Button>
                  <Button size="sm" asChild className="flex-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                    <Link href="/register" onClick={() => setMobileOpen(false)}>Get Started</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

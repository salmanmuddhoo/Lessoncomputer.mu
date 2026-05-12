'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, ChevronDown, BookOpen, GraduationCap } from 'lucide-react'
import { Logo } from '@/components/lc/logo'
import { Button } from '@/components/ui/button'

const GRADES = [
  { name: 'Grade 7',       slug: 'grade-7' },
  { name: 'Grade 8',       slug: 'grade-8' },
  { name: 'Grade 9',       slug: 'grade-9' },
  { name: 'Grade 10',      slug: 'grade-10' },
  { name: 'Grade 11 (SC)', slug: 'grade-11' },
  { name: 'Grade 12 (HSC)',slug: 'grade-12' },
]

interface HeaderProps {
  user?: { email?: string; role?: string } | null
}

export function Header({ user }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [gradesOpen, setGradesOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">

          {/* Logo */}
          <Logo />

          {/* Desktop nav — centred, DM Sans, like Boty */}
          <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            <Link href="/" className="px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground lc-transition rounded-lg hover:bg-secondary">
              Home
            </Link>

            {/* Grades dropdown */}
            <div className="relative" onMouseEnter={() => setGradesOpen(true)} onMouseLeave={() => setGradesOpen(false)}>
              <button className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground lc-transition rounded-lg hover:bg-secondary">
                Grades <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${gradesOpen ? 'rotate-180' : ''}`} />
              </button>
              {gradesOpen && (
                <div className="absolute top-full left-0 mt-1 w-44 bg-card border border-border rounded-xl lc-shadow py-1.5 animate-scale-fade-in">
                  {GRADES.map((g) => (
                    <Link
                      key={g.slug}
                      href={`/grades/${g.slug}`}
                      className="block px-4 py-2 text-sm text-foreground/70 hover:text-foreground hover:bg-secondary lc-transition"
                    >
                      {g.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link href="/live-classes" className="px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground lc-transition rounded-lg hover:bg-secondary">
              Live Classes
            </Link>
            <Link href="/pricing" className="px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground lc-transition rounded-lg hover:bg-secondary">
              Pricing
            </Link>
            <Link href="/about" className="px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground lc-transition rounded-lg hover:bg-secondary">
              About
            </Link>
          </nav>

          {/* Desktop auth — right side */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <Button asChild size="sm" className="bg-foreground text-background hover:bg-foreground/90 font-medium rounded-full px-5">
                <Link href={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'}>Dashboard</Link>
              </Button>
            ) : (
              <>
                <Link href="/login" className="px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground lc-transition">
                  Log in
                </Link>
                <Button size="sm" asChild className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-full px-5">
                  <Link href="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary lc-transition"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card animate-scale-fade-in">
          <div className="px-5 py-5 space-y-1">
            {[{ label: 'Home', href: '/' }, { label: 'Live Classes', href: '/live-classes' }, { label: 'Pricing', href: '/pricing' }, { label: 'About', href: '/about' }].map((item) => (
              <Link key={item.href} href={item.href} className="block px-3 py-2.5 text-sm font-medium hover:bg-secondary rounded-xl lc-transition" onClick={() => setMobileOpen(false)}>
                {item.label}
              </Link>
            ))}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-3 pt-3 pb-1">Grades</p>
            {GRADES.map((g) => (
              <Link key={g.slug} href={`/grades/${g.slug}`} className="block px-3 py-2.5 text-sm hover:bg-secondary rounded-xl lc-transition" onClick={() => setMobileOpen(false)}>
                {g.name}
              </Link>
            ))}
            <div className="border-t border-border my-3 pt-3 flex gap-2">
              {user ? (
                <Button asChild size="sm" className="flex-1 rounded-full bg-foreground text-background hover:bg-foreground/90">
                  <Link href={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'} onClick={() => setMobileOpen(false)}>Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" asChild className="flex-1 rounded-full">
                    <Link href="/login" onClick={() => setMobileOpen(false)}>Log in</Link>
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

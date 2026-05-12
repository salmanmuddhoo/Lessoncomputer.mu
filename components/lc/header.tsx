'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, BookOpen, Video, Users, ChevronDown } from 'lucide-react'
import { Logo } from '@/components/lc/logo'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const GRADES = [
  { name: 'Grade 7', slug: 'grade-7' },
  { name: 'Grade 8', slug: 'grade-8' },
  { name: 'Grade 9', slug: 'grade-9' },
  { name: 'Grade 10', slug: 'grade-10' },
  { name: 'Grade 11 (SC)', slug: 'grade-11' },
  { name: 'Grade 12 (HSC)', slug: 'grade-12' },
]

interface HeaderProps {
  user?: { email?: string; role?: string } | null
}

export function Header({ user }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Logo />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1">
                  <BookOpen className="w-4 h-4" />
                  Grades
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                {GRADES.map((g) => (
                  <DropdownMenuItem key={g.slug} asChild>
                    <Link href={`/grades/${g.slug}`}>{g.name}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="sm" asChild>
              <Link href="/live-classes">
                <Video className="w-4 h-4 mr-1" />
                Live Classes
              </Link>
            </Button>

            <Button variant="ghost" size="sm" asChild>
              <Link href="/pricing">Pricing</Link>
            </Button>
          </nav>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <Button asChild size="sm">
                <Link href={user.role === 'admin' ? '/admin' : '/dashboard'}>
                  Dashboard
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button size="sm" asChild className="bg-primary text-primary-foreground hover:bg-accent">
                  <Link href="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card">
          <div className="px-4 py-4 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Grades</p>
            {GRADES.map((g) => (
              <Link
                key={g.slug}
                href={`/grades/${g.slug}`}
                className="block px-3 py-2 rounded-md text-sm hover:bg-secondary"
                onClick={() => setMobileOpen(false)}
              >
                {g.name}
              </Link>
            ))}
            <div className="border-t border-border my-3" />
            <Link href="/live-classes" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-secondary" onClick={() => setMobileOpen(false)}>
              <Video className="w-4 h-4" /> Live Classes
            </Link>
            <Link href="/pricing" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-secondary" onClick={() => setMobileOpen(false)}>
              Pricing
            </Link>
            <div className="border-t border-border my-3" />
            {user ? (
              <Link href={user.role === 'admin' ? '/admin' : '/dashboard'} className="block" onClick={() => setMobileOpen(false)}>
                <Button className="w-full" size="sm">Dashboard</Button>
              </Link>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <Link href="/login" onClick={() => setMobileOpen(false)}>Log in</Link>
                </Button>
                <Button size="sm" asChild className="flex-1 bg-primary text-primary-foreground hover:bg-accent">
                  <Link href="/register" onClick={() => setMobileOpen(false)}>Get Started</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

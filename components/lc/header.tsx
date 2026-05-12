'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, ChevronDown } from 'lucide-react'
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
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Logo />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="font-medium gap-1 text-foreground/80 hover:text-foreground">
                  Grades
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                {GRADES.map((g) => (
                  <DropdownMenuItem key={g.slug} asChild>
                    <Link href={`/grades/${g.slug}`}>{g.name}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="sm" asChild className="font-medium text-foreground/80 hover:text-foreground">
              <Link href="/live-classes">Live Classes</Link>
            </Button>

            <Button variant="ghost" size="sm" asChild className="font-medium text-foreground/80 hover:text-foreground">
              <Link href="/pricing">Pricing</Link>
            </Button>
          </nav>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <Button asChild size="sm" className="bg-foreground text-background hover:bg-foreground/90 font-medium rounded-full px-5">
                <Link href={user.role === 'admin' ? '/admin' : '/dashboard'}>
                  Dashboard
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="font-medium text-foreground/80 hover:text-foreground">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button size="sm" asChild className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-full px-5">
                  <Link href="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
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
        <div className="md:hidden border-t border-border bg-card animate-blur-in">
          <div className="px-5 py-5 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Grades</p>
            {GRADES.map((g) => (
              <Link
                key={g.slug}
                href={`/grades/${g.slug}`}
                className="block px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-secondary lc-transition"
                onClick={() => setMobileOpen(false)}
              >
                {g.name}
              </Link>
            ))}
            <div className="border-t border-border my-4" />
            {['Live Classes', 'Pricing'].map((label) => (
              <Link
                key={label}
                href={`/${label.toLowerCase().replace(' ', '-')}`}
                className="block px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-secondary lc-transition"
                onClick={() => setMobileOpen(false)}
              >
                {label}
              </Link>
            ))}
            <div className="border-t border-border my-4" />
            {user ? (
              <Link href={user.role === 'admin' ? '/admin' : '/dashboard'} onClick={() => setMobileOpen(false)}>
                <Button className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-full" size="sm">Dashboard</Button>
              </Link>
            ) : (
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" asChild className="flex-1 rounded-full">
                  <Link href="/login" onClick={() => setMobileOpen(false)}>Log in</Link>
                </Button>
                <Button size="sm" asChild className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full">
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

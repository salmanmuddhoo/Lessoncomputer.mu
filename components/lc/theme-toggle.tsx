'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

// Light/dark toggle. Renders a stable icon before mount to avoid a hydration mismatch.
// `showLabel` renders a full-width labelled row (for sidebars); otherwise an icon button.
export function ThemeToggle({ className, showLabel = false }: { className?: string; showLabel?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === 'dark'
  const Icon = isDark ? Sun : Moon
  const label = isDark ? 'Light mode' : 'Dark mode'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={label}
      className={cn(
        showLabel
          ? 'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors'
          : 'inline-flex items-center justify-center rounded-lg p-2 text-current hover:bg-muted/60 transition-colors',
        className
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {showLabel && label}
    </button>
  )
}

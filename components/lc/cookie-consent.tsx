'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Cookie } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'lc-cookie-consent'

// Site-wide cookie consent banner. Shows once until the visitor accepts, then
// remembers the choice in localStorage so it never reappears on that device.
export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch {
      // localStorage unavailable (e.g. privacy mode) — don't block the page
    }
  }, [])

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, 'accepted')
    } catch {
      // ignore write failures
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] p-3 sm:p-5">
      <div className="mx-auto max-w-3xl rounded-xl border border-border/60 bg-card shadow-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-3 flex-1">
          <Cookie className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            We use cookies to keep you signed in and remember your preferences. By continuing to use
            LessonComputer.mu, you agree to our{' '}
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
          </p>
        </div>
        <div className="flex gap-2 shrink-0 justify-end">
          <Button asChild variant="outline" size="sm">
            <Link href="/privacy">Learn more</Link>
          </Button>
          <Button
            size="sm"
            onClick={accept}
            className="bg-primary text-primary-foreground hover:bg-accent"
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'lc_pwa_prompt_last_shown'
const INSTALLED_KEY = 'lc_pwa_installed'
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000 // re-ask at most once a week if dismissed
const SHOW_DELAY_MS = 20_000 // don't interrupt the very first moment on the page

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches || (window.navigator as any).standalone === true
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream
}

// Prompts the visitor to install the site as an app — on Chrome/Android via the native
// beforeinstallprompt flow, on iOS Safari (which has no such event) via a short "Add to
// Home Screen" instruction. Only asks periodically (COOLDOWN_MS), never once installed.
export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [platform, setPlatform] = useState<'android' | 'ios' | null>(null)

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(INSTALLED_KEY) === '1') return

    // Register the service worker — required for Chrome to consider the site installable.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* non-fatal */ })
    }

    function canShowAgain(): boolean {
      const last = Number(localStorage.getItem(STORAGE_KEY) ?? '0')
      return Date.now() - last > COOLDOWN_MS
    }

    let timer: ReturnType<typeof setTimeout> | null = null

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      if (canShowAgain()) {
        timer = setTimeout(() => { setPlatform('android'); setVisible(true) }, SHOW_DELAY_MS)
      }
    }

    function onAppInstalled() {
      localStorage.setItem(INSTALLED_KEY, '1')
      setVisible(false)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    // iOS Safari never fires beforeinstallprompt — show manual instructions instead,
    // on the same cooldown.
    if (isIos() && canShowAgain()) {
      timer = setTimeout(() => { setPlatform('ios'); setVisible(true) }, SHOW_DELAY_MS)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
      if (timer) clearTimeout(timer)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
    setVisible(false)
  }

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') localStorage.setItem(INSTALLED_KEY, '1')
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
    setDeferredPrompt(null)
    setVisible(false)
  }

  if (!visible || !platform) return null

  return (
    <div className="fixed bottom-6 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-sm z-50 rounded-2xl border border-border/60 bg-card shadow-xl p-4 animate-scale-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Install LessonComputer.mu</p>
          {platform === 'ios' ? (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Tap <span className="font-medium text-foreground">Share</span> then{' '}
              <span className="font-medium text-foreground">Add to Home Screen</span> for quick,
              full-screen access.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Add the app to your home screen for quick, full-screen access to your lessons.
            </p>
          )}
          <div className="flex items-center gap-2 mt-3">
            {platform === 'android' && (
              <Button size="sm" className="h-7 text-xs bg-primary text-primary-foreground hover:bg-accent" onClick={handleInstall}>
                Install
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
        <button onClick={dismiss} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

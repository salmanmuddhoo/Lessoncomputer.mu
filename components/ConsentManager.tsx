'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { Cookie } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  getConsent, setConsent, isTrackingAllowed, type ConsentValue,
  CONSENT_CHANGE_EVENT, OPEN_SETTINGS_EVENT,
} from '@/lib/consent'

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID

// Cookie banner (first visit), the "Cookie settings" preferences panel, and the only place
// Google Tag Manager is loaded — and only once consent is given (and not inside the student
// area for an account not known to be an adult). GA4, Meta Pixel and Stape.io all run through
// GTM, so gating GTM gates all of them.
export function ConsentManager() {
  const pathname = usePathname()
  const [consent, setConsentState] = useState<ConsentValue | null | undefined>(undefined)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [analyticsOn, setAnalyticsOn] = useState(false)
  const [loadGtm, setLoadGtm] = useState(false)

  useEffect(() => {
    setConsentState(getConsent())
    const onChange = (e: Event) => setConsentState((e as CustomEvent<ConsentValue>).detail)
    const onOpen = () => { setAnalyticsOn(getConsent() === 'accepted'); setSettingsOpen(true) }
    window.addEventListener(CONSENT_CHANGE_EVENT, onChange)
    window.addEventListener(OPEN_SETTINGS_EVENT, onOpen)
    return () => {
      window.removeEventListener(CONSENT_CHANGE_EVENT, onChange)
      window.removeEventListener(OPEN_SETTINGS_EVENT, onOpen)
    }
  }, [])

  // Once loaded GTM can't be unloaded, so this only ever flips on.
  useEffect(() => {
    if (consent === 'accepted' && isTrackingAllowed()) setLoadGtm(true)
  }, [consent, pathname])

  function choose(value: ConsentValue) {
    const wasLoaded = loadGtm
    setConsent(value)
    setSettingsOpen(false)
    // Withdrawing consent after GTM has loaded: a reload is the only way to stop its tags.
    if (value === 'rejected' && wasLoaded) window.location.reload()
  }

  return (
    <>
      {GTM_ID && loadGtm && (
        <Script id="gtm" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
          var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
          j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${GTM_ID}');
        `}</Script>
      )}

      {consent === null && !settingsOpen && (
        <div className="fixed inset-x-0 bottom-0 z-[70] p-3 sm:p-5" role="dialog" aria-label="Cookie consent">
          <div className="mx-auto max-w-3xl rounded-xl border border-border/60 bg-card shadow-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-start gap-3 flex-1">
              <Cookie className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                We use strictly necessary cookies to keep you signed in. With your consent we also use
                analytics and advertising cookies to understand how the site is used and measure our ads.
                See our <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>.
              </p>
            </div>
            <div className="flex gap-2 shrink-0 justify-end">
              <Button variant="outline" size="sm" onClick={() => choose('rejected')}>Reject</Button>
              <Button size="sm" onClick={() => choose('accepted')} className="bg-primary text-primary-foreground hover:bg-accent">
                Accept
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md z-[80]">
          <DialogHeader>
            <DialogTitle>Cookie settings</DialogTitle>
            <DialogDescription>
              Choose which cookies LessonComputer.mu may use. You can change this at any time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-border/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Strictly necessary</p>
                <span className="text-xs text-muted-foreground">Always on</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Keep you signed in and protect forms. The site cannot work without them.</p>
            </div>
            <label className="flex items-start justify-between gap-3 rounded-lg border border-border/60 p-3 cursor-pointer">
              <div>
                <p className="text-sm font-medium">Analytics and advertising</p>
                <p className="text-xs text-muted-foreground mt-1">Google Analytics 4, Meta Pixel and Stape.io, loaded through Google Tag Manager.</p>
              </div>
              <input
                type="checkbox"
                checked={analyticsOn}
                onChange={(e) => setAnalyticsOn(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-primary"
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Read the full <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => choose('rejected')}>Reject all</Button>
            <Button onClick={() => choose(analyticsOn ? 'accepted' : 'rejected')} className="bg-primary text-primary-foreground hover:bg-accent">
              Save choices
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))} className={className}>
      Cookie settings
    </button>
  )
}

// Rendered by the student layout so tracking knows whether this account is a known adult.
export function TrackingAudience({ knownAdult }: { knownAdult: boolean }) {
  useEffect(() => {
    ;(window as any).__lcKnownAdult = knownAdult
  }, [knownAdult])
  return null
}

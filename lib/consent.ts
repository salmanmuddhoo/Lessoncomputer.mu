// Cookie consent for analytics/advertising tags (GTM → GA4, Meta Pixel, Stape.io), per the
// Cookie Policy: a real cookie, kept 12 months, with "Reject" as easy as "Accept". Strictly
// necessary cookies (auth/session/security) never depend on this.

export type ConsentValue = 'accepted' | 'rejected'

const COOKIE = 'lc_cookie_consent'
const MAX_AGE = 60 * 60 * 24 * 365 // 12 months
export const CONSENT_CHANGE_EVENT = 'lc-consent-change'
export const OPEN_SETTINGS_EVENT = 'lc-open-cookie-settings'

export function getConsent(): ConsentValue | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=(accepted|rejected)`))
  return (m?.[1] as ConsentValue | undefined) ?? null
}

export function setConsent(value: ConsentValue) {
  document.cookie = `${COOKIE}=${value}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
  if (value === 'rejected') clearTrackingCookies()
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: value }))
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))
}

// Withdrawing consent removes the analytics/advertising cookies those tools already set.
function clearTrackingCookies() {
  const host = location.hostname
  const domains = ['', host, `.${host}`, `.${host.split('.').slice(-2).join('.')}`]
  for (const c of document.cookie.split('; ')) {
    const name = c.split('=')[0]
    if (!/^(_ga|_gid|_gat|_gcl|_fbp|_fbc|FPID|FPLC|_dc_gtm)/.test(name)) continue
    for (const d of domains) {
      document.cookie = `${name}=; Max-Age=0; Path=/${d ? `; Domain=${d}` : ''}`
    }
  }
}

// Inside the student area, tags only run for an account we know belongs to an adult — a
// child's click is not valid consent (Cookie Policy §4). The student layout reports whether
// the signed-in account is a known adult; unknown is treated as a minor.
export function isStudentAreaPath(pathname: string) {
  return pathname.startsWith('/dashboard') || pathname.startsWith('/payment/result') || pathname.startsWith('/onboarding')
}

export function isTrackingAllowed(): boolean {
  if (typeof window === 'undefined') return false
  if (getConsent() !== 'accepted') return false
  if (isStudentAreaPath(window.location.pathname) && !(window as any).__lcKnownAdult) return false
  return true
}

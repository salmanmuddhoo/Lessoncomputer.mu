// "How did you hear about us?" options — captured at signup for marketing insight.
// Shared by the register form, the onboarding form, and admin displays.
export const REFERRAL_SOURCES = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'google', label: 'Google Search' },
  { value: 'friend', label: 'Friend / Word of mouth' },
  { value: 'other', label: 'Other' },
] as const

export type ReferralSource = (typeof REFERRAL_SOURCES)[number]['value']

export function referralLabel(value?: string | null): string {
  if (!value) return '—'
  return REFERRAL_SOURCES.find((s) => s.value === value)?.label ?? value
}

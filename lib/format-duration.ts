// Video package access duration is configured by admins in WEEKS (subscription_packages
// .expires_days is stored as weeks*7); a null/unset value means unlimited ("lifetime") access.
// Shared by every place that shows this to a student/parent BEFORE purchase — the product
// card, the checkout summary, and the grade info page — so it stays consistent everywhere.
export function formatAccessDuration(expiresDays: number | null | undefined): string {
  if (expiresDays == null) return 'Lifetime access'
  const weeks = Math.max(1, Math.round(expiresDays / 7))
  return `${weeks} week${weeks === 1 ? '' : 's'} access`
}

// Phone-number helpers shared by client and server (no side effects, safe to bundle anywhere).

// Normalise a stored phone number to full international digits (E.164 without the '+').
// New numbers are captured with a country code (Mauritius defaults to 230). Legacy numbers
// were stored as bare local Mauritius digits (7–8 digits, no country code); those are
// assumed to be Mauritius and get the 230 prefix. Anything longer already carries a country
// code and is left as-is, so international numbers are never mangled.
export function normalizeWhatsAppDigits(raw: string | null | undefined): string {
  const digits = (raw ?? '').replace(/[^\d]/g, '')
  if (!digits) return ''
  return digits.length <= 8 ? `230${digits}` : digits
}

// Display form: full international number with a leading '+' (empty string when no number).
export function formatWhatsAppDisplay(raw: string | null | undefined): string {
  const digits = normalizeWhatsAppDigits(raw)
  return digits ? `+${digits}` : ''
}

// Thin wrapper over the official WhatsApp Cloud API (1-to-1 messages only — the API
// cannot create/manage groups or post to a group). Returns a result instead of throwing
// so callers can send in bulk and report per-recipient success/failure.
//
// NOTE: free-form `text` messages are only delivered inside the 24h customer-service
// window (i.e. after the parent has messaged the business number). For business-initiated
// sends to "cold" numbers, WhatsApp requires a pre-approved message TEMPLATE — configure
// those in Meta and switch `type` to `template` once approved.

import { normalizeWhatsAppDigits } from '@/lib/phone'

export type WhatsAppResult = { ok: boolean; error?: string }

export function isWhatsAppConfigured(): boolean {
  return !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN)
}

export async function sendWhatsAppText(to: string, body: string): Promise<WhatsAppResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneNumberId || !accessToken) {
    return { ok: false, error: 'WhatsApp is not configured' }
  }

  const digits = normalizeWhatsAppDigits(to) // full international E.164 digits
  if (digits.length < 7) return { ok: false, error: 'Invalid phone number' }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: digits,
          type: 'text',
          text: { body },
        }),
      }
    )

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('[whatsapp] API error', res.status, detail)
      // 401/403 almost always means the WhatsApp access token is invalid, expired, or
      // revoked (Meta "temporary" tokens expire after 24h — use a permanent System User
      // token). Surface an actionable message instead of a bare status code.
      if (res.status === 401 || res.status === 403) {
        return { ok: false, error: 'WhatsApp access token is invalid or expired — update WHATSAPP_ACCESS_TOKEN.' }
      }
      return { ok: false, error: `WhatsApp API returned ${res.status}` }
    }
    return { ok: true }
  } catch (err) {
    console.error('[whatsapp] send failed', err)
    return { ok: false, error: 'Network error contacting WhatsApp' }
  }
}

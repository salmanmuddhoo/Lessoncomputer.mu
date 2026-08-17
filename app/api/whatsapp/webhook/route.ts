import { NextRequest, NextResponse } from 'next/server'

// WhatsApp Cloud API webhook endpoint.
//
// Meta's "Configuration → Webhooks" screen asks for a Callback URL and a Verify token:
//   • Callback URL  = https://<your-domain>/api/whatsapp/webhook
//   • Verify token  = any secret string you choose, set as WHATSAPP_WEBHOOK_VERIFY_TOKEN
//     in the environment (it must match exactly what you type into Meta).
//
// Webhooks are only needed to RECEIVE events (inbound messages, delivery/read statuses) —
// they are NOT required to SEND messages. This handler completes the verification handshake
// and acknowledges events; we don't act on inbound events yet.

// GET: verification handshake. Meta calls this once with hub.mode/hub.verify_token/
// hub.challenge and expects the challenge echoed back verbatim (200) when the token matches.
export function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const mode = params.get('hub.mode')
  const token = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge') ?? ''
  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN

  if (mode === 'subscribe' && expected && token === expected) {
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

// POST: event delivery (inbound messages, statuses). Acknowledge fast so Meta doesn't retry.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    console.log('[whatsapp] webhook event', JSON.stringify(body))
  } catch {
    /* ignore malformed bodies — still ack below */
  }
  return NextResponse.json({ received: true })
}

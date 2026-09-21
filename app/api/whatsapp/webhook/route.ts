import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { normalizeWhatsAppDigits } from '@/lib/phone'

// WhatsApp Cloud API webhook endpoint.
//
// Meta's "Configuration → Webhooks" screen asks for a Callback URL and a Verify token:
//   • Callback URL  = https://<your-domain>/api/whatsapp/webhook
//   • Verify token  = any secret string you choose, set as WHATSAPP_WEBHOOK_VERIFY_TOKEN
//     in the environment (it must match exactly what you type into Meta).
//
// Webhooks are only needed to RECEIVE events (inbound messages, delivery/read statuses) —
// they are NOT required to SEND messages. This handler completes the verification handshake,
// stores inbound text messages into whatsapp_conversations/whatsapp_messages (the admin inbox),
// and records delivery/read statuses against previously-sent outbound messages.

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
  console.warn('[whatsapp] webhook verification failed', { mode, tokenMatches: token === expected, tokenConfigured: !!expected })
  return new NextResponse('Forbidden', { status: 403 })
}

// A parent's phone may be stored either as full international digits or as a legacy bare
// Mauritius local number (no country code) — match either so an inbound sender resolves to
// the right student even if their profile predates the country-code change.
async function resolveStudentIdByPhone(admin: ReturnType<typeof createServiceRoleClient>, fullDigits: string): Promise<string | null> {
  const local = fullDigits.length > 8 ? fullDigits.slice(-8) : fullDigits
  const { data } = await (admin as any)
    .from('profiles')
    .select('id')
    .or(`parent_phone.eq.${fullDigits},parent_phone.eq.${local}`)
    .limit(1)
    .maybeSingle()
  return (data as any)?.id ?? null
}

// POST: event delivery (inbound messages, statuses). Acknowledge fast so Meta doesn't retry.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ received: true })

  try {
    const admin = createServiceRoleClient()

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {}
        // Diagnostic: if Meta is calling this endpoint but no conversation ever shows up
        // in the admin inbox, check Vercel logs for this line — it confirms delivery is
        // reaching us and shows exactly what field/message type was sent.
        console.log('[whatsapp] webhook change', {
          field: change.field,
          messageCount: (value.messages ?? []).length,
          messageTypes: (value.messages ?? []).map((m: any) => m.type),
          statusCount: (value.statuses ?? []).length,
        })

        // Inbound messages — the two-way inbox.
        for (const msg of value.messages ?? []) {
          if (msg.type !== 'text' || !msg.text?.body) {
            console.log('[whatsapp] skipping non-text inbound message', { type: msg.type })
            continue
          }

          const fromDigits = normalizeWhatsAppDigits(msg.from)
          if (!fromDigits) continue
          const contactName = (value.contacts ?? []).find((c: any) => c.wa_id === msg.from)?.profile?.name ?? null
          const studentId = await resolveStudentIdByPhone(admin, fromDigits)
          const preview = String(msg.text.body).slice(0, 200)

          const { data: convo } = await (admin as any)
            .from('whatsapp_conversations')
            .upsert(
              {
                phone: fromDigits,
                contact_name: contactName,
                student_id: studentId,
                last_message_at: new Date().toISOString(),
                last_message_preview: preview,
              },
              { onConflict: 'phone' }
            )
            .select('id, unread_count')
            .single()
          if (!convo) continue

          const { error: insertError } = await (admin as any)
            .from('whatsapp_messages')
            .insert({
              conversation_id: convo.id,
              direction: 'in',
              wa_message_id: msg.id ?? null,
              body: msg.text.body,
            })
          // Unique violation on wa_message_id = Meta redelivered the same event; skip the
          // unread bump so retries don't inflate the admin's unread count.
          if (!insertError) {
            await (admin as any)
              .from('whatsapp_conversations')
              .update({ unread_count: (convo.unread_count ?? 0) + 1 })
              .eq('id', convo.id)
          }
        }

        // Delivery/read receipts for messages we sent — best-effort status tracking.
        for (const status of value.statuses ?? []) {
          if (!status.id || !status.status) continue
          await (admin as any)
            .from('whatsapp_messages')
            .update({ status: status.status })
            .eq('wa_message_id', status.id)
        }
      }
    }
  } catch (err) {
    console.error('[whatsapp] webhook processing failed', err)
    /* still ack below — Meta retries aggressively on non-200 */
  }

  return NextResponse.json({ received: true })
}

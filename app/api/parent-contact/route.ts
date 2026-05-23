import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function sendWhatsApp(to: string, groupUrl: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken  = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    console.warn('[parent-contact] WhatsApp env vars not configured — skipping send')
    return
  }

  // Normalise to E.164 digits only (strip +, spaces, dashes)
  const digits = to.replace(/[^\d]/g, '')

  const body = {
    messaging_product: 'whatsapp',
    to: digits,
    type: 'text',
    text: {
      body:
        `Hello! Your child has enrolled in live classes at Lesson Computer. ` +
        `Join our parents' WhatsApp group to stay updated:\n\n${groupUrl}`,
    },
  }

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    console.error('[parent-contact] WhatsApp API error', res.status, err)
    throw new Error(`WhatsApp API returned ${res.status}`)
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { phone } = await req.json() as { phone?: string }
  if (!phone || phone.trim().length < 7) {
    return NextResponse.json({ error: 'A valid phone number is required' }, { status: 400 })
  }

  const trimmedPhone = phone.trim()

  // Save parent phone
  const { error: profileError } = await (supabase as any)
    .from('profiles')
    .update({ parent_phone: trimmedPhone })
    .eq('id', user.id)

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  // Fetch WhatsApp group URL from site_settings
  const { data: settings } = await (supabase as any)
    .from('site_settings')
    .select('whatsapp_group_url')
    .eq('id', 1)
    .single()

  const groupUrl = settings?.whatsapp_group_url as string | null

  if (groupUrl) {
    try {
      await sendWhatsApp(trimmedPhone, groupUrl)
      await (supabase as any)
        .from('profiles')
        .update({ parent_whatsapp_sent_at: new Date().toISOString() })
        .eq('id', user.id)
    } catch (err) {
      // Non-fatal: phone is saved, WA message failed — log and continue
      console.error('[parent-contact] Failed to send WhatsApp:', err)
    }
  } else {
    console.warn('[parent-contact] No whatsapp_group_url configured in site_settings')
  }

  return NextResponse.json({ ok: true })
}

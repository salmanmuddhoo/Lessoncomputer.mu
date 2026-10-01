// Server-side Meta Conversions API Purchase event — see docs/TRACKING.md Step 4. The browser
// Purchase (lib/track.ts) is lost whenever a parent pays and closes the tab before the success
// page loads, or blocks trackers, so every order that gets marked 'paid' also calls this once
// from the server, using the SAME event_id as the browser push so Meta de-duplicates the two.
import crypto from 'crypto'

const GRAPH = 'v24.0' // confirm the current Graph API version when revisiting this

const sha = (v?: string | null) =>
  v ? crypto.createHash('sha256').update(v.trim().toLowerCase()).digest('hex') : undefined

// Student's OWN phone number is never collected (only their parent's, a different person) —
// so there is intentionally no phone hash here. See docs/TRACKING.md Step 3 note on user_data.
const arr = (v?: string) => (v ? [v] : undefined)

// Sends one Meta CAPI Purchase for `orderId`, unless it was already sent (meta_capi_sent_at).
// `admin` must be a service-role Supabase client — students have no UPDATE policy on
// mips_orders, and `auth.admin.getUserById` requires the service role key.
export async function sendMetaPurchase(admin: any, orderId: string): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN
  if (!pixelId || !accessToken) {
    console.error('[meta-capi] META_PIXEL_ID/META_CAPI_ACCESS_TOKEN not configured — skipping Purchase for order', orderId)
    return
  }

  const { data: order } = await admin
    .from('mips_orders')
    .select('id, student_id, amount, order_type, package_ids, created_at, updated_at, tracking, meta_capi_sent_at')
    .eq('id', orderId)
    .maybeSingle()
  if (!order || order.meta_capi_sent_at) return // not found, or already sent — never twice

  const [{ data: profile }, { data: authUser }] = await Promise.all([
    admin.from('profiles').select('full_name').eq('id', order.student_id).maybeSingle(),
    admin.auth.admin.getUserById(order.student_id),
  ])
  const email: string | undefined = authUser?.user?.email ?? undefined
  const fullName: string = profile?.full_name ?? ''
  const [firstName, ...rest] = fullName.split(' ').filter(Boolean)
  const lastName = rest.join(' ') || undefined

  const t = (order.tracking ?? {}) as { fbp?: string; fbc?: string; ip?: string; ua?: string; page_url?: string }
  const packageIds: string[] = order.package_ids ?? []

  const body: any = {
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor(new Date(order.updated_at ?? order.created_at).getTime() / 1000),
      event_id: `purchase_${order.id}`,
      action_source: 'website',
      event_source_url: t.page_url,
      user_data: {
        em: arr(sha(email)),
        fn: arr(sha(firstName)),
        ln: arr(sha(lastName)),
        country: arr(sha('mu')),
        external_id: arr(sha(order.student_id)),
        client_ip_address: t.ip,
        client_user_agent: t.ua,
        fbp: t.fbp,
        fbc: t.fbc,
      },
      custom_data: {
        currency: 'MUR',
        value: order.amount,
        order_id: String(order.id),
        content_type: 'product',
        content_category: order.order_type,
        content_ids: packageIds.map(String),
        contents: packageIds.map((id) => ({ id: String(id), quantity: 1 })),
        num_items: packageIds.length,
      },
    }],
  }
  if (process.env.VERCEL_ENV !== 'production' && process.env.META_TEST_EVENT_CODE) {
    body.test_event_code = process.env.META_TEST_EVENT_CODE // staging goes to Test events only
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH}/${pixelId}/events?access_token=${accessToken}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    )
    if (!res.ok) {
      console.error('[meta-capi] Purchase failed', order.id, await res.text().catch(() => ''))
      return // never block the payment flow on a Meta error
    }
  } catch (err) {
    console.error('[meta-capi] Purchase request failed', order.id, err)
    return
  }

  await admin.from('mips_orders').update({ meta_capi_sent_at: new Date().toISOString() }).eq('id', order.id)
}

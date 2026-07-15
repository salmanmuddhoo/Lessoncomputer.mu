import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { decryptImnCallback, verifyImnChecksum, type MipsEnvironment } from '@/lib/mips'
import { getMonthDateRange } from '@/lib/subscription-billing'

// MIPS requires the response body to be the literal string "success" or "fail"
const imn = (s: 'success' | 'fail') =>
  new NextResponse(s, { status: 200, headers: { 'Content-Type': 'text/plain' } })

// The ODRP token key name varies across MIPS environments (id_token, token.id_token,
// odrp_token, card_token, …). Recursively scan the decrypted payload for the first
// non-empty string under any key that looks like a token so we don't miss it.
function findOdrpToken(obj: unknown, depth = 0): string | null {
  if (!obj || typeof obj !== 'object' || depth > 4) return null
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const k = key.toLowerCase()
    if ((k === 'id_token' || k.endsWith('_token') || k === 'token') && typeof value === 'string' && value.trim()) {
      return value.trim()
    }
    if (value && typeof value === 'object') {
      const nested = findOdrpToken(value, depth + 1)
      if (nested) return nested
    }
  }
  return null
}

// MIPS IMN (Instant Merchant Notification) callback
// MIPS POSTs encrypted data here — supports both JSON and form-encoded bodies
export async function POST(req: NextRequest) {
  const rawText = await req.text()
  const contentType = req.headers.get('content-type') ?? ''
  console.error('[payment/callback] received', { contentType, rawText: rawText.slice(0, 300) })

  try {
    // Parse both JSON and application/x-www-form-urlencoded
    let cryptedData = ''
    if (contentType.includes('application/json')) {
      const parsed = JSON.parse(rawText) as Record<string, unknown>
      cryptedData = (parsed.received_crypted_data ?? parsed.crypted_data ?? parsed.crypted_callback ?? '') as string
    } else {
      // form-encoded or unknown — try URLSearchParams first, fallback to JSON
      try {
        const params = new URLSearchParams(rawText)
        cryptedData = params.get('received_crypted_data') ?? params.get('crypted_data') ?? params.get('crypted_callback') ?? ''
      } catch {
        const parsed = JSON.parse(rawText) as Record<string, unknown>
        cryptedData = (parsed.received_crypted_data ?? parsed.crypted_data ?? parsed.crypted_callback ?? '') as string
      }
    }

    if (!cryptedData) {
      console.error('[payment/callback] Missing crypted data. Raw body:', rawText.slice(0, 500))
      return imn('fail')
    }

    const admin = createServiceRoleClient()

    const { data: settings } = await (admin as any)
      .from('site_settings')
      .select('mips_environment')
      .eq('id', 1)
      .single()
    const env: MipsEnvironment = (settings?.mips_environment as MipsEnvironment) ?? 'test'

    // decryptImnCallback now returns ImnTransactionDetails directly (no wrapper)
    const details = await decryptImnCallback(cryptedData, env)
    console.error('[payment/callback] decrypted', { id_order: details.id_order, merchant_order_id: details.merchant_order_id, status: details.status })

    if (!details?.merchant_order_id) {
      console.error('[payment/callback] Decrypted data missing merchant_order_id:', details)
      return imn('fail')
    }

    const checksumValid = verifyImnChecksum(details)
    if (!checksumValid) {
      console.error('[payment/callback] Checksum mismatch for order:', details.merchant_order_id)
      // Log but don't block — some MIPS environments don't send checksum
    }

    // Look up by merchant_order_id (our toMipsOrderId value), not id_order (MIPS-generated)
    const { data: orderRaw } = await (admin as any)
      .from('mips_orders')
      .select('id, student_id, order_type, package_ids, is_recurring, status, metadata')
      .eq('mips_transaction_id', details.merchant_order_id)
      .single()

    const order = orderRaw as {
      id: string
      student_id: string
      order_type: 'video' | 'live' | 'mixed'
      package_ids: string[]
      is_recurring: boolean
      status: string
      metadata: { recurringAmount?: number | null; [key: string]: unknown } | null
    } | null

    if (!order) {
      console.error('[payment/callback] Order not found for merchant_order_id:', details.merchant_order_id)
      return imn('fail')
    }

    if (order.status === 'paid') {
      return imn('success') // idempotent
    }

    // status is uppercase 'SUCCESS' or 'FAIL'
    if (details.status?.toUpperCase() === 'SUCCESS') {
      // Resolve valid_from/valid_until for live packages by looking up their month/year
      const { data: pkgRows } = await (admin as any)
        .from('subscription_packages')
        .select('id, package_type, month, year')
        .in('id', order.package_ids)
      const pkgMap = new Map<string, { package_type: string; month: number | null; year: number | null }>(
        (pkgRows ?? []).map((p: any) => [p.id, p])
      )

      // Only the latest live_month package (highest year/month) should be recurring —
      // past months added to the same order are one-time purchases.
      const latestLivePkgId = order.package_ids.reduce<string | null>((best, id) => {
        const pkg = pkgMap.get(id)
        if (pkg?.package_type !== 'live_month' || !pkg.month || !pkg.year) return best
        if (!best) return id
        const bestPkg = pkgMap.get(best)!
        return pkg.year > bestPkg.year || (pkg.year === bestPkg.year && pkg.month > bestPkg.month)
          ? id : best
      }, null)

      const subscriptionRows = order.package_ids.map((packageId: string) => {
        const pkg = pkgMap.get(packageId)
        const isLivePkg = pkg?.package_type === 'live_month'
        const dates = isLivePkg && pkg.month && pkg.year
          ? getMonthDateRange(pkg.month, pkg.year)
          : { validFrom: null, validUntil: null }
        return {
          student_id:        order.student_id,
          package_id:        packageId,
          subscription_type: isLivePkg ? 'live' : 'video',
          is_recurring:      order.is_recurring && packageId === latestLivePkgId,
          status:            'active',
          valid_from:        dates.validFrom,
          valid_until:       dates.validUntil,
        }
      })

      const { error: subError } = await (admin as any)
        .from('student_subscriptions')
        .upsert(subscriptionRows, { onConflict: 'student_id,package_id' })

      if (subError) {
        console.error('[payment/callback] Subscription activation failed:', subError)
        return imn('fail')
      }

      // If this order includes a recurring live purchase, clear is_recurring on every other
      // recurring subscription so only the latest one triggers future billing cron charges.
      // (Only live subs are ever recurring, so no subscription_type filter is needed.)
      if (order.is_recurring && (order.order_type === 'live' || order.order_type === 'mixed')) {
        await (admin as any)
          .from('student_subscriptions')
          .update({ is_recurring: false, updated_at: new Date().toISOString() })
          .eq('student_id', order.student_id)
          .eq('is_recurring', true)
          .not('package_id', 'in', `(${order.package_ids.join(',')})`)
      }

      await (admin as any)
        .from('mips_orders')
        .update({
          status:     'paid',
          // Merge — preserve recurringAmount/env set at create time instead of overwriting
          metadata:   { ...(order.metadata ?? {}), transaction_id: details.transaction_id, payment_method: details.payment_method },
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      // ODRP token: check the known fields first, then deep-scan for any token-like key
      const idToken = details.id_token ?? details.token?.id_token ?? findOdrpToken(details)
      if (order.is_recurring && idToken) {
        const { error: tokenError } = await (admin as any)
          .from('student_payment_tokens')
          .upsert({
            student_id:           order.student_id,
            id_token:             idToken,
            card_last_four_digit: details.card_last_four_digit ?? null,
            max_amount:           order.metadata?.recurringAmount ?? Number(details.amount) / 100,
            currency:             details.currency,
            is_active:            true,
            source_order_id:      order.id,
            updated_at:           new Date().toISOString(),
          }, { onConflict: 'student_id' })
        if (tokenError) {
          console.error('[payment/callback] Failed to store ODRP token:', tokenError, 'for student:', order.student_id)
        } else {
          console.log('[payment/callback] ODRP token stored for student:', order.student_id)
        }
      } else if (order.is_recurring) {
        // Recurring order but no token found — surface the payload keys so we can locate it
        console.error('[payment/callback] Recurring order but NO ODRP token found in callback.', {
          student_id: order.student_id,
          keys: Object.keys(details),
        })
      }

      console.log('[payment/callback] Paid & subscriptions activated for merchant_order_id:', details.merchant_order_id)
      return imn('success')
    } else {
      await (admin as any)
        .from('mips_orders')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', order.id)
      console.error('[payment/callback] Payment failed/rejected:', details.merchant_order_id, details.status)
      return imn('fail')
    }
  } catch (err) {
    console.error('[payment/callback] error:', String(err), 'raw:', rawText.slice(0, 300))
    return imn('fail')
  }
}

export async function GET() {
  // Health check — lets us verify the callback URL is reachable
  return NextResponse.json({ ok: true, endpoint: 'payment/callback' })
}

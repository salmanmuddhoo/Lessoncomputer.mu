import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { createMipsPayment, type MipsEnvironment } from '@/lib/mips'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = await req.json() as {
      orderType: 'video' | 'live' | 'mixed'
      packageIds: string[]
      amount?: number
      description: string
      isRecurring?: boolean
      liveAmount?: number
    }

    const { orderType, packageIds, description, isRecurring = false } = body

    if (!orderType || !packageIds?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Guarantee a profiles row exists: mips_orders.student_id has an FK to profiles,
    // so a user whose signup trigger never created their profile would otherwise fail
    // the order insert with a foreign-key violation. Create it (from signup metadata)
    // if missing; leave an existing profile untouched (ON CONFLICT DO NOTHING).
    const meta = (user.user_metadata ?? {}) as { full_name?: string; grade_id?: string }
    {
      const profileAdmin = createServiceRoleClient()
      const { error: profileError } = await (profileAdmin as any)
        .from('profiles')
        .upsert(
          { id: user.id, full_name: meta.full_name ?? null, grade_id: meta.grade_id ?? null },
          { onConflict: 'id', ignoreDuplicates: true }
        )
      if (profileError) console.error('[payment/create] ensure profile failed:', profileError)
    }

    // The paying student's name — for the MIPS "Client details" tab. Prefer the
    // profile's current full_name (may have been edited since signup) over signup metadata.
    const { data: paymentProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    const clientName = (paymentProfile as { full_name: string | null } | null)?.full_name ?? meta.full_name ?? undefined
    const clientEmail = user.email ?? undefined

    // Determine whether the student already holds a recurring live subscription for the
    // grade(s) in this order, and block only months that recurring subscription actually
    // covers. A recurring subscription covers ITS month and every LATER month (auto-charged
    // by the billing cron) — but NOT earlier months. So a student whose recurring sub is for a
    // FUTURE month (e.g. bought next month first) can still buy the CURRENT (or a past) month
    // as a one-off catch-up.
    let hasExistingGradeRecurring = false
    if (orderType === 'live' || orderType === 'mixed') {
      const { data: orderLivePkgs } = await (supabase as any)
        .from('subscription_packages')
        .select('id, grade_id, month, year')
        .in('id', packageIds)
        .eq('package_type', 'live_month')

      const orderGradeIds = [...new Set(((orderLivePkgs ?? []) as any[]).map((p) => p.grade_id).filter(Boolean))]

      let recurringCovers: Array<{ grade_id: string; month: number; year: number }> = []
      if (orderGradeIds.length > 0) {
        const { data: recSubs } = await (supabase as any)
          .from('student_subscriptions')
          .select('package:subscription_packages(grade_id, month, year, package_type)')
          .eq('student_id', user.id)
          .eq('status', 'active')
          .eq('is_recurring', true)
          .not('package_id', 'is', null)
        recurringCovers = ((recSubs ?? []) as any[])
          .map((s) => s.package)
          .filter((p) => p && p.package_type === 'live_month' && orderGradeIds.includes(p.grade_id))
      }
      hasExistingGradeRecurring = recurringCovers.length > 0

      // Block a month only if an existing recurring subscription for the same grade already
      // covers it (its month or a later, auto-charged month).
      const monthKey = (y: number, m: number) => y * 12 + m
      const alreadyCovered = ((orderLivePkgs ?? []) as any[]).some((p) =>
        recurringCovers.some((r) => r.grade_id === p.grade_id && monthKey(p.year, p.month) >= monthKey(r.year, r.month))
      )
      if (alreadyCovered) {
        return NextResponse.json(
          { error: 'You already have an active recurring subscription that covers this month for this grade — it will be charged automatically. You can still buy earlier (past) months.' },
          { status: 400 }
        )
      }
    }

    // Video packages are always one-off; live subscriptions can be recurring — EXCEPT when the
    // student already holds a recurring subscription for the grade. In that case this purchase
    // (e.g. the current month bought after subscribing to a future month) is a one-off catch-up;
    // the existing recurring subscription keeps auto-charging the future months.
    const effectiveRecurring =
      (orderType === 'live' || orderType === 'mixed') && !hasExistingGradeRecurring ? isRecurring : false

    // ── Authoritative server-side pricing ──────────────────────────────────
    // NEVER trust the client's `amount`/`liveAmount`. Recompute from the real
    // prices so a tampered request can't unlock content for less than it costs.
    // Video packages use their own `price`; live_month packages are priced per
    // grade via `grades.live_subscription_price` (their own price column is 0).
    const { data: pricePkgs, error: priceErr } = await (supabase as any)
      .from('subscription_packages')
      .select('id, price, package_type, grade_id, is_active, is_archived')
      .in('id', packageIds)

    if (priceErr || !pricePkgs || pricePkgs.length !== packageIds.length) {
      return NextResponse.json({ error: 'Invalid packages selected' }, { status: 400 })
    }

    // Reject archived/inactive packages — an archived past-month live package must not be
    // purchasable even if a stale client still references it.
    if (pricePkgs.some((p: any) => p.is_archived || p.is_active === false)) {
      return NextResponse.json({ error: 'One or more selected packages are no longer available for purchase.' }, { status: 400 })
    }

    const liveGradeIds = Array.from(
      new Set(pricePkgs.filter((p: any) => p.package_type === 'live_month').map((p: any) => p.grade_id).filter(Boolean))
    )
    let liveByGrade: Record<string, number> = {}
    if (liveGradeIds.length) {
      const { data: gradeRows } = await (supabase as any)
        .from('grades')
        .select('id, live_subscription_price')
        .in('id', liveGradeIds)
      liveByGrade = Object.fromEntries(
        (gradeRows ?? []).map((g: any) => [g.id, Number(g.live_subscription_price) || 0])
      )
    }

    let amount = 0
    let serverLiveAmount: number | null = null
    for (const p of pricePkgs as any[]) {
      if (p.package_type === 'live_month') {
        const monthPrice = liveByGrade[p.grade_id] ?? 0
        amount += monthPrice
        serverLiveAmount = monthPrice // single-month live price (uniform per grade)
      } else {
        amount += Number(p.price) || 0
      }
    }
    amount = Math.round(amount * 100) / 100 // guard float drift on numeric(10,2)

    if (amount <= 0) {
      return NextResponse.json({ error: 'Selected packages have no price configured' }, { status: 400 })
    }

    // Read MIPS environment from site_settings
    const { data: settings } = await (supabase as any)
      .from('site_settings')
      .select('mips_environment')
      .eq('id', 1)
      .single()
    const env: MipsEnvironment = (settings?.mips_environment as MipsEnvironment) ?? 'test'

    // Create pending order record first to get the UUID (used to derive MIPS id_order)
    const { data: order, error: orderError } = await (supabase as any)
      .from('mips_orders')
      .insert({
        student_id:  user.id,
        order_type:  orderType,
        package_ids: packageIds,
        is_recurring: effectiveRecurring,
        amount,
        currency:    'MUR',
        description,
        status:      'pending',
        metadata:    { env, recurringAmount: effectiveRecurring ? serverLiveAmount : null },
      })
      .select('id')
      .single()

    if (orderError || !order) {
      const msg = orderError?.message ?? 'unknown'
      console.error('[payment/create] Failed to create order:', msg)
      return NextResponse.json({ error: 'Could not start payment. Please try again.' }, { status: 500 })
    }

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''
    const orderId = (order as { id: string }).id

    // Debug: confirm env vars are present (lengths only, never values). Off by default.
    if (process.env.DEBUG_PAYMENTS === 'true') {
      console.error('[payment/create] env check', {
        MIPS_ID_MERCHANT:        process.env.MIPS_ID_MERCHANT        ? `set(${process.env.MIPS_ID_MERCHANT.length})`        : 'MISSING',
        MIPS_ID_ENTITY:          process.env.MIPS_ID_ENTITY          ? `set(${process.env.MIPS_ID_ENTITY.length})`          : 'MISSING',
        MIPS_ID_OPERATOR:        process.env.MIPS_ID_OPERATOR        ? `set(${process.env.MIPS_ID_OPERATOR.length})`        : 'MISSING',
        MIPS_OPERATOR_PASSWORD:  process.env.MIPS_OPERATOR_PASSWORD  ? `set(${process.env.MIPS_OPERATOR_PASSWORD.length})`  : 'MISSING',
        MIPS_AUTH_USERNAME:      process.env.MIPS_AUTH_USERNAME      ? `set(${process.env.MIPS_AUTH_USERNAME.length})`      : 'MISSING',
        MIPS_AUTH_PASSWORD:      process.env.MIPS_AUTH_PASSWORD      ? `set(${process.env.MIPS_AUTH_PASSWORD.length})`      : 'MISSING',
        MIPS_HASH_SALT:          process.env.MIPS_HASH_SALT          ? `set(${process.env.MIPS_HASH_SALT.length})`          : 'MISSING',
        MIPS_CIPHER_KEY:         process.env.MIPS_CIPHER_KEY         ? `set(${process.env.MIPS_CIPHER_KEY.length})`         : 'MISSING',
        NEXT_PUBLIC_SITE_URL:    process.env.NEXT_PUBLIC_SITE_URL    ?? 'MISSING',
        env,
      })
    }

    // For recurring live subscriptions, use ODRP mode to tokenize the card so
    // future months can be claimed server-side without the student re-entering details.
    // Use the server-computed monthly live price for maxAmountPerClaim, not the full
    // order total which may include one-time video packages or past months.
    const recurringMonthlyAmount = serverLiveAmount ?? amount
    const odrpParams = effectiveRecurring ? {
      maxAmountTotal:    recurringMonthlyAmount * 24,  // up to 24 months total
      maxAmountPerClaim: recurringMonthlyAmount,
      maxFrequency:      1,            // once per period
      maxDate:           new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    } : undefined

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? origin).replace(/\/$/, '')
    const result = await createMipsPayment({
      env,
      orderId,
      amount,
      currency: 'MUR',
      description,
      returnUrl:       `${origin}/payment/result?orderId=${orderId}`,
      notificationUrl: `${siteUrl}/api/payment/callback`,
      clientName,
      clientEmail,
      odrp: odrpParams,
    })

    // Store the MIPS id_order so the IMN callback can look up this order.
    // Uses service-role: students have no UPDATE policy on mips_orders.
    const admin = createServiceRoleClient()
    await (admin as any)
      .from('mips_orders')
      .update({ mips_transaction_id: result.mipsOrderId })
      .eq('id', orderId)

    return NextResponse.json({ paymentUrl: result.paymentUrl })
  } catch (err) {
    console.error('[payment/create]', err)
    return NextResponse.json({ error: 'Could not start payment. Please try again.' }, { status: 500 })
  }
}

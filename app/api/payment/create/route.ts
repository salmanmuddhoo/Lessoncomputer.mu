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
      amount: number
      description: string
      isRecurring?: boolean
      liveAmount?: number
    }

    const { orderType, packageIds, amount, description, isRecurring = false, liveAmount } = body

    if (!orderType || !packageIds?.length || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Video packages are always one-off; only live subscriptions can be recurring
    const effectiveRecurring = (orderType === 'live' || orderType === 'mixed') ? isRecurring : false

    // Block duplicate purchase: if student already has a recurring live subscription for
    // this grade, the cron will auto-charge them — no need for a manual purchase
    if (orderType === 'live' || orderType === 'mixed') {
      const { data: gradeInfo } = await (supabase as any)
        .from('subscription_packages')
        .select('grade_id')
        .in('id', packageIds)
        .limit(1)
        .single()

      if (gradeInfo?.grade_id) {
        const { data: recurringSubs } = await supabase
          .from('student_subscriptions')
          .select('package_id')
          .eq('student_id', user.id)
          .eq('status', 'active')
          .eq('is_recurring', true)
          .not('package_id', 'is', null)

        if (recurringSubs && recurringSubs.length > 0) {
          const recurringPkgIds = recurringSubs.map((s: any) => s.package_id).filter(Boolean)
          const { count } = await (supabase as any)
            .from('subscription_packages')
            .select('id', { count: 'exact', head: true })
            .in('id', recurringPkgIds)
            .eq('grade_id', gradeInfo.grade_id)
            .eq('package_type', 'live_month')

          if (count && count > 0) {
            return NextResponse.json(
              { error: 'You already have an active recurring subscription for this grade. Next month will be charged automatically on your billing date.' },
              { status: 400 }
            )
          }
        }
      }
    }

    // Block duplicate purchase: if student already has a recurring live subscription for
    // this grade, the cron will auto-charge them — no need for a manual purchase
    if (orderType === 'live') {
      const { data: gradeInfo } = await (supabase as any)
        .from('subscription_packages')
        .select('grade_id')
        .in('id', packageIds)
        .limit(1)
        .single()

      if (gradeInfo?.grade_id) {
        const { data: recurringSubs } = await supabase
          .from('student_subscriptions')
          .select('package_id')
          .eq('student_id', user.id)
          .eq('status', 'active')
          .eq('is_recurring', true)
          .not('package_id', 'is', null)

        if (recurringSubs && recurringSubs.length > 0) {
          const recurringPkgIds = recurringSubs.map((s: any) => s.package_id).filter(Boolean)
          const { count } = await (supabase as any)
            .from('subscription_packages')
            .select('id', { count: 'exact', head: true })
            .in('id', recurringPkgIds)
            .eq('grade_id', gradeInfo.grade_id)
            .eq('package_type', 'live_month')

          if (count && count > 0) {
            return NextResponse.json(
              { error: 'You already have an active recurring subscription for this grade. Next month will be charged automatically on your billing date.' },
              { status: 400 }
            )
          }
        }
      }
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
        metadata:    { env, recurringAmount: effectiveRecurring ? (liveAmount ?? null) : null },
      })
      .select('id')
      .single()

    if (orderError || !order) {
      const msg = orderError?.message ?? 'unknown'
      console.error('[payment/create] Failed to create order:', msg)
      // Most likely cause: migration 024 not applied in production DB
      if (msg.includes('does not exist') || msg.includes('relation')) {
        return NextResponse.json(
          { error: 'Database migration 024 not applied. Run the migration in Supabase SQL Editor.' },
          { status: 500 }
        )
      }
      return NextResponse.json({ error: `Failed to create order: ${msg}` }, { status: 500 })
    }

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''
    const orderId = (order as { id: string }).id

    // Debug: confirm env vars are present (lengths only, never log values)
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
      notificationUrl: `${(process.env.NEXT_PUBLIC_SITE_URL ?? origin).replace(/\/$/, '')}/api/payment/callback`,
      env,
    })

    // For recurring live subscriptions, use ODRP mode to tokenize the card so
    // future months can be claimed server-side without the student re-entering details.
    // Use liveAmount (monthly live price) for maxAmountPerClaim, not the full order total
    // which may include one-time video packages or past months.
    const recurringMonthlyAmount = liveAmount ?? amount
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
    const msg = String(err)
    console.error('[payment/create]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

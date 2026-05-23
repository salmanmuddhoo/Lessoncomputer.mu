import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createMipsPayment, type MipsEnvironment } from '@/lib/mips'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = await req.json() as {
      orderType: 'video' | 'live'
      packageIds: string[]
      amount: number
      description: string
      isRecurring?: boolean
    }

    const { orderType, packageIds, amount, description, isRecurring = false } = body

    if (!orderType || !packageIds?.length || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Video packages are always one-off; only live subscriptions can be recurring
    const effectiveRecurring = orderType === 'live' ? isRecurring : false

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
        metadata:    { env },
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
      MIPS_HASH_SALT:          process.env.MIPS_HASH_SALT          ? `set(${process.env.MIPS_HASH_SALT.length})`          : 'MISSING',
      MIPS_CIPHER_KEY:         process.env.MIPS_CIPHER_KEY         ? `set(${process.env.MIPS_CIPHER_KEY.length})`         : 'MISSING',
      NEXT_PUBLIC_SITE_URL:    process.env.NEXT_PUBLIC_SITE_URL    ?? 'MISSING',
      env,
    })

    const result = await createMipsPayment({
      env,
      orderId,
      amount,
      currency: 'MUR',
      description,
      returnUrl: `${origin}/payment/result?orderId=${orderId}`,
    })

    // Store the MIPS id_order so the IMN callback can look up this order
    await (supabase as any)
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

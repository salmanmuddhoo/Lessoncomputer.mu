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
        is_recurring: isRecurring,
        amount,
        currency:    'MUR',
        description,
        status:      'pending',
        metadata:    { env },
      })
      .select('id')
      .single()

    if (orderError || !order) {
      console.error('[payment/create] Failed to create order:', orderError)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''
    const orderId = (order as { id: string }).id

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
    console.error('[payment/create]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

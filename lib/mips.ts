import crypto from 'crypto'

export type MipsEnvironment = 'test' | 'production'

function getBaseUrl(env: MipsEnvironment): string {
  if (env === 'production') {
    return process.env.MIPS_PROD_URL ?? 'https://api.mips.mu'
  }
  return process.env.MIPS_TEST_URL ?? 'https://api.mips.mu'
}

function getCredentials() {
  return {
    authUsername:      process.env.MIPS_AUTH_USERNAME ?? '',
    authPassword:      process.env.MIPS_AUTH_PASSWORD ?? '',
    idMerchant:        process.env.MIPS_ID_MERCHANT ?? '',
    idEntity:          process.env.MIPS_ID_ENTITY ?? '',
    idOperator:        process.env.MIPS_ID_OPERATOR ?? '',
    operatorPassword:  process.env.MIPS_OPERATOR_PASSWORD ?? '',
    hashSalt:          process.env.MIPS_HASH_SALT ?? '',
  }
}

export interface CreatePaymentParams {
  env: MipsEnvironment
  orderId: string
  amount: number
  currency?: string
  description: string
  returnUrl: string
  cancelUrl: string
  callbackUrl: string
}

export interface CreatePaymentResult {
  paymentUrl: string
  transactionId: string
}

export async function createMipsPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
  const { env, orderId, amount, currency = 'MUR', description, returnUrl, cancelUrl, callbackUrl } = params
  const creds = getCredentials()
  const baseUrl = getBaseUrl(env)

  const authToken = Buffer.from(`${creds.authUsername}:${creds.authPassword}`).toString('base64')

  // Amount in cents (MUR has 2 decimal places)
  const amountCents = Math.round(amount * 100)

  const body = {
    idMerchant:       creds.idMerchant,
    idEntity:         creds.idEntity,
    idOperator:       creds.idOperator,
    operatorPassword: creds.operatorPassword,
    transactionId:    orderId,
    amount:           amountCents,
    currency,
    description,
    returnUrl,
    cancelUrl,
    callbackUrl,
    mode:             'simple',
  }

  const response = await fetch(`${baseUrl}/api/claim_payment_request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${authToken}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`MIPS API error ${response.status}: ${text}`)
  }

  const data = await response.json() as { paymentUrl?: string; redirectUrl?: string; transactionId?: string }
  const paymentUrl = data.paymentUrl ?? data.redirectUrl
  if (!paymentUrl) {
    throw new Error(`MIPS response missing paymentUrl: ${JSON.stringify(data)}`)
  }

  return {
    paymentUrl,
    transactionId: data.transactionId ?? orderId,
  }
}

// Verify the HMAC hash from MIPS IMN callback
export function verifyMipsCallback(params: {
  transactionId: string
  amount: string | number
  status: string
  receivedHash: string
}): boolean {
  const { transactionId, amount, status, receivedHash } = params
  const hashSalt = process.env.MIPS_HASH_SALT ?? ''
  const payload = `${transactionId}|${amount}|${status}|${hashSalt}`
  const computed = crypto.createHash('sha256').update(payload).digest('hex')
  return computed === receivedHash
}

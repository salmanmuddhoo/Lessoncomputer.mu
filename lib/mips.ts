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
    idMerchant:       process.env.MIPS_ID_MERCHANT ?? '',
    idEntity:         process.env.MIPS_ID_ENTITY ?? '',
    idOperator:       process.env.MIPS_ID_OPERATOR ?? '',
    operatorPassword: process.env.MIPS_OPERATOR_PASSWORD ?? '',
    hashSalt:         process.env.MIPS_HASH_SALT ?? '',
  }
}

// MIPS id_order: 5–25 alphanumeric chars — strip hyphens from UUID and truncate
export function toMipsOrderId(uuid: string): string {
  return uuid.replace(/-/g, '').slice(0, 25)
}

export interface CreatePaymentParams {
  env: MipsEnvironment
  orderId: string
  amount: number
  currency?: string
  description: string
  returnUrl: string
}

export interface CreatePaymentResult {
  paymentUrl: string
  mipsOrderId: string
}

export async function createMipsPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
  const { env, orderId, amount, currency = 'MUR', description, returnUrl } = params
  const creds = getCredentials()
  const baseUrl = getBaseUrl(env)
  const mipsOrderId = toMipsOrderId(orderId)

  const body = {
    authentify: {
      id_merchant:       creds.idMerchant,
      id_entity:         creds.idEntity,
      id_operator:       creds.idOperator,
      operator_password: creds.operatorPassword,
    },
    request: {
      request_mode: 'simple',
      sending_mode: 'link',
      request_title: description.slice(0, 200),
    },
    initial_payment: {
      id_order:  mipsOrderId,
      currency,
      amount,
    },
    iframe_behavior: {
      custom_redirection_url: returnUrl,
    },
  }

  const response = await fetch(`${baseUrl}/api/create_payment_request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.78 Safari/537.36',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`MIPS API error ${response.status}: ${text}`)
  }

  const data = await response.json() as {
    operation_status: string
    operation_details?: string
    payment_link?: { url: string; qr_code: string }
  }

  if (data.operation_status !== 'success' || !data.payment_link?.url) {
    throw new Error(`MIPS payment request failed: ${data.operation_details ?? JSON.stringify(data)}`)
  }

  return {
    paymentUrl: data.payment_link.url,
    mipsOrderId,
  }
}

// Verify HMAC hash from MIPS IMN callback
// Adjust the payload format if MIPS documentation specifies a different hash scheme
export function verifyMipsCallback(params: {
  mipsOrderId: string
  amount: string | number
  status: string
  receivedHash: string
}): boolean {
  const { mipsOrderId, amount, status, receivedHash } = params
  const hashSalt = process.env.MIPS_HASH_SALT ?? ''
  if (!hashSalt) return true // skip verification if salt not configured
  const payload = `${mipsOrderId}|${amount}|${status}|${hashSalt}`
  const computed = crypto.createHash('sha256').update(payload).digest('hex')
  return computed === receivedHash
}

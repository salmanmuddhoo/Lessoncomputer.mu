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
    cipherKey:        process.env.MIPS_CIPHER_KEY ?? '',
  }
}

function getMipsHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.78 Safari/537.36',
  }
}

// MIPS id_order: 5–25 alphanumeric chars — strip hyphens from UUID and truncate
export function toMipsOrderId(uuid: string): string {
  return uuid.replace(/-/g, '').slice(0, 25)
}

// ─── Create payment request ───────────────────────────────────────────────────

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

  const url = `${baseUrl}/api/create_payment_request`
  const headers = getMipsHeaders()
  console.error('[mips] POST', url, {
    idMerchant: creds.idMerchant ? `set(${creds.idMerchant.length})` : 'MISSING',
    mipsOrderId,
    amount,
    authHeader: headers['Authorization'] ? `Basic set(${headers['Authorization'].length})` : 'MISSING',
  })

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    // Detect HTML error pages (e.g. Apache 401/403) and give a cleaner message
    const isHtml = text.trimStart().startsWith('<')
    throw new Error(
      isHtml
        ? `MIPS API returned HTTP ${response.status}. Check credentials or contact MIPS support.`
        : `MIPS API error ${response.status}: ${text}`
    )
  }

  const data = await response.json() as {
    operation_status: string
    operation_details?: string
    payment_link?: { url: string; qr_code: string }
  }

  if (data.operation_status !== 'success' || !data.payment_link?.url) {
    throw new Error(`MIPS payment request failed: ${data.operation_details ?? JSON.stringify(data)}`)
  }

  return { paymentUrl: data.payment_link.url, mipsOrderId }
}

// ─── Decrypt IMN callback ─────────────────────────────────────────────────────

export interface ImnTransactionDetails {
  amount: string        // in cents, e.g. "1025" = Rs 10.25
  currency: string
  status: 'success' | 'fail'
  id_order: string
  transaction_id: string
  type: string
  payment_method: string
  checksum: string
  reason_fail?: string
}

export interface DecryptImnResult {
  transaction_details: ImnTransactionDetails
}

export async function decryptImnCallback(
  cryptedData: string,
  env: MipsEnvironment,
): Promise<DecryptImnResult> {
  const creds = getCredentials()
  const baseUrl = getBaseUrl(env)

  const body = {
    authentify: {
      id_merchant:       creds.idMerchant,
      id_entity:         creds.idEntity,
      id_operator:       creds.idOperator,
      operator_password: creds.operatorPassword,
    },
    salt:                  creds.hashSalt,
    cipher_key:            creds.cipherKey,
    received_crypted_data: cryptedData,
  }

  const response = await fetch(`${baseUrl}/api/decrypt_imn_data`, {
    method: 'POST',
    headers: getMipsHeaders(),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`MIPS decrypt error ${response.status}: ${text}`)
  }

  return response.json() as Promise<DecryptImnResult>
}

// ─── Checksum verification ────────────────────────────────────────────────────

// Checksum = SHA256(amount.currency.status.id_order.transaction_id.type.payment_method.salt)
export function verifyImnChecksum(details: ImnTransactionDetails): boolean {
  const salt = process.env.MIPS_HASH_SALT ?? ''
  const { amount, currency, status, id_order, transaction_id, type, payment_method, checksum } = details
  const payload = `${amount}.${currency}.${status}.${id_order}.${transaction_id}.${type}.${payment_method}.${salt}`
  const computed = crypto.createHash('sha256').update(payload).digest('hex')
  return computed === checksum
}

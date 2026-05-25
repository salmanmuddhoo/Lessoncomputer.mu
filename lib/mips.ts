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
  // For recurring live subscriptions: use ODRP mode to tokenize the card.
  // The student is informed on the MIPS page that future claims may be taken.
  odrp?: {
    maxAmountTotal:    number   // total claimable across all claims
    maxAmountPerClaim: number   // max per individual claim
    maxFrequency:      number   // max claims per period
    maxDate:           string   // ISO date string (YYYY-MM-DD)
  }
}

export interface CreatePaymentResult {
  paymentUrl: string
  mipsOrderId: string
}

export async function createMipsPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
  const { env, orderId, amount, currency = 'MUR', description, returnUrl, odrp } = params
  const creds = getCredentials()
  const baseUrl = getBaseUrl(env)
  const mipsOrderId = toMipsOrderId(orderId)

  const body: Record<string, unknown> = {
    authentify: {
      id_merchant:       creds.idMerchant,
      id_entity:         creds.idEntity,
      id_operator:       creds.idOperator,
      operator_password: creds.operatorPassword,
    },
    request: {
      request_mode:  odrp ? 'odrp' : 'simple',
      sending_mode:  'link',
      request_title: description.slice(0, 200),
      ...(odrp && {
        max_amount_total:    odrp.maxAmountTotal,
        max_amount_per_claim: odrp.maxAmountPerClaim,
        max_frequency:       odrp.maxFrequency,
        max_date:            odrp.maxDate,
      }),
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
  console.error('[mips] POST', url, {
    idMerchant: creds.idMerchant ? `set(${creds.idMerchant.length})` : 'MISSING',
    mipsOrderId,
    amount,
    mode: odrp ? 'odrp' : 'simple',
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: getMipsHeaders(),
    body: JSON.stringify(body),
  })

  const responseText = await response.text()
  console.error('[mips] create_payment_request response', {
    status: response.status,
    statusText: response.statusText,
    body: responseText.slice(0, 500), // first 500 chars to avoid log bloat
    headers: Object.fromEntries(response.headers.entries()),
  })

  if (!response.ok) {
    throw new Error(`MIPS API error ${response.status}: ${responseText}`)
  }

  let data: { operation_status: string; operation_details?: string; payment_link?: { url: string; qr_code: string } }
  try {
    data = JSON.parse(responseText)
  } catch {
    throw new Error(`MIPS API returned non-JSON ${response.status}: ${responseText}`)
  }

  if (data.operation_status !== 'success' || !data.payment_link?.url) {
    throw new Error(`MIPS payment request failed: ${data.operation_details ?? JSON.stringify(data)}`)
  }

  return { paymentUrl: data.payment_link.url, mipsOrderId }
}

// ─── Claim recurring payment (ODRP) ──────────────────────────────────────────

export interface ClaimPaymentParams {
  env: MipsEnvironment
  orderId: string
  amount: number
  currency?: string
  idToken: string
}

export interface ClaimPaymentResult {
  status: 'SUCCESS' | 'FAIL' | 'ERROR' | 'Rejected'
  reason: string
}

export async function claimMipsPayment(params: ClaimPaymentParams): Promise<ClaimPaymentResult> {
  const { env, orderId, amount, currency = 'MUR', idToken } = params
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
    order: {
      id_order:  mipsOrderId,
      currency,
      amount,
      id_token:  idToken,
    },
  }

  console.error('[mips] CLAIM', `${baseUrl}/api/claim_payment_request`, {
    mipsOrderId,
    amount,
    idToken: `set(${idToken.length})`,
  })

  const response = await fetch(`${baseUrl}/api/claim_payment_request`, {
    method: 'POST',
    headers: getMipsHeaders(),
    body: JSON.stringify(body),
  })

  const claimText = await response.text()
  console.error('[mips] claim_payment_request response', { status: response.status, body: claimText.slice(0, 500) })

  if (!response.ok) {
    throw new Error(`MIPS claim error ${response.status}: ${claimText}`)
  }

  const data = JSON.parse(claimText) as { payment_status: string; Reason: string }
  return { status: data.payment_status as ClaimPaymentResult['status'], reason: data.Reason }
}

// ─── Cancel ODRP token ────────────────────────────────────────────────────────

export interface CancelOdrpTokenParams {
  env: MipsEnvironment
  idToken: string
  cardLastFourDigit: string
}

export async function cancelOdrpToken(params: CancelOdrpTokenParams): Promise<void> {
  const { env, idToken, cardLastFourDigit } = params
  const creds = getCredentials()
  const baseUrl = getBaseUrl(env)

  const body = {
    authentify: {
      id_merchant:       creds.idMerchant,
      id_entity:         creds.idEntity,
      id_operator:       creds.idOperator,
      operator_password: creds.operatorPassword,
    },
    id_token:             idToken,
    card_last_four_digit: cardLastFourDigit,
  }

  console.error('[mips] CANCEL ODRP', `${baseUrl}/api/cancel_odrp_token`)

  const response = await fetch(`${baseUrl}/api/cancel_odrp_token`, {
    method: 'POST',
    headers: getMipsHeaders(),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('[mips] cancel_odrp_token error:', response.status, text)
    // Non-fatal: log but don't throw — token may already be cancelled on MIPS side
  }
}

// ─── Decrypt IMN callback ─────────────────────────────────────────────────────

export interface ImnTransactionDetails {
  amount: string
  currency: string
  status: 'success' | 'fail'
  id_order: string
  transaction_id: string
  type: string
  payment_method: string
  checksum: string
  reason_fail?: string
  id_token?: string              // present when odrp mode tokenizes the card
  card_last_four_digit?: string  // present when card payment is tokenized
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

  const decryptText = await response.text()
  console.error('[mips] decrypt_imn_data response', { status: response.status, body: decryptText.slice(0, 500) })

  if (!response.ok) {
    throw new Error(`MIPS decrypt error ${response.status}: ${decryptText}`)
  }

  return JSON.parse(decryptText) as DecryptImnResult
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

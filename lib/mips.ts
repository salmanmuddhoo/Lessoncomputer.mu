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
    // MIPS docs require a non-empty user-agent
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
  // For recurring live subscriptions: enable MIPS tokenization so subsequent
  // months can be claimed without the student re-entering card details.
  // Requires MIPS to have tokenization enabled on the merchant account.
  recurring?: {
    maxAmount: number       // max Rs amount claimable per claim
    maxClaims: number       // max number of recurring claims (e.g. 12 for annual)
    maxDate: string         // ISO date string — MIPS will reject claims after this
  }
}

export interface CreatePaymentResult {
  paymentUrl: string
  mipsOrderId: string
}

export async function createMipsPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
  const { env, orderId, amount, currency = 'MUR', description, returnUrl, recurring } = params
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
      request_mode:  recurring ? 'recurring' : 'simple',
      sending_mode:  'link',
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

  // Add recurring constraints when tokenization is requested
  if (recurring) {
    body.recurring = {
      max_amount:           recurring.maxAmount,
      max_number_of_claims: recurring.maxClaims,
      max_date_for_claims:  recurring.maxDate,
    }
  }

  const url = `${baseUrl}/api/create_payment_request`
  console.error('[mips] POST', url, {
    idMerchant: creds.idMerchant ? `set(${creds.idMerchant.length})` : 'MISSING',
    mipsOrderId,
    amount,
    recurring: !!recurring,
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: getMipsHeaders(),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
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

// ─── Claim recurring payment ──────────────────────────────────────────────────

export interface ClaimPaymentParams {
  env: MipsEnvironment
  orderId: string       // new unique order ID for this claim
  amount: number
  currency?: string
  idToken: string       // 128-char token stored from initial payment
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

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`MIPS claim error ${response.status}: ${text}`)
  }

  const data = await response.json() as { payment_status: string; Reason: string }
  return { status: data.payment_status as ClaimPaymentResult['status'], reason: data.Reason }
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
  id_token?: string     // 128-char token — present when tokenization is enabled
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

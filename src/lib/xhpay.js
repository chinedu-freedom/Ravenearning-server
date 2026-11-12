import crypto from 'crypto';

/**
 * Format raw RSA private key (with or without PEM headers) into valid PEM format
 */
export function wrapPrivateKeyPem(raw) {
  if (!raw) return '';
  let clean = raw.trim();
  if (clean.includes('BEGIN')) {
    return clean.replace(/\\n/g, '\n');
  }
  const chunked = clean.match(/.{1,64}/g)?.join('\n') || clean;
  return `-----BEGIN RSA PRIVATE KEY-----\n${chunked}\n-----END RSA PRIVATE KEY-----\n`;
}

/**
 * Build MD5 signature for XHPAY Collection, Status Queries, and Callback Verification
 * Rules:
 * 1. Exclude 'signature' and 'rsa_signature'
 * 2. Filter out null, undefined, and empty string ''
 * 3. Sort keys alphabetically (ksort)
 * 4. Concatenate key=value&
 * 5. Strip trailing &
 * 6. Append HMAC SHA-256 Key
 * 7. Return MD5 hex digest
 */
export function buildXhPaySign(data, hmacKey) {
  if (!data || !hmacKey) return '';
  const sortedKeys = Object.keys(data).sort();
  let signString = '';
  for (const key of sortedKeys) {
    if (
      key !== 'signature' &&
      key !== 'rsa_signature' &&
      data[key] !== '' &&
      data[key] !== null &&
      data[key] !== undefined
    ) {
      signString += `${key}=${data[key]}&`;
    }
  }
  signString = signString.slice(0, -1);
  return crypto.createHash('md5').update(signString + hmacKey).digest('hex');
}

/**
 * Build RSA-SHA256 signature for XHPAY Payout / Withdrawal
 * Rules:
 * 1. Exclude 'rsa_signature'
 * 2. Filter out null, undefined, and empty string ''
 * 3. Sort keys alphabetically
 * 4. Concatenate key=value&
 * 5. Strip trailing &
 * 6. Sign using SHA256withRSA and base64 encode
 */
export function signXhPayWithdrawal(data, privateKeyRaw) {
  if (!data || !privateKeyRaw) {
    throw new Error('Missing data or RSA private key for payout signing');
  }
  const sortedKeys = Object.keys(data).sort();
  let signString = '';
  for (const key of sortedKeys) {
    if (
      key !== 'rsa_signature' &&
      data[key] !== '' &&
      data[key] !== null &&
      data[key] !== undefined
    ) {
      signString += `${key}=${data[key]}&`;
    }
  }
  signString = signString.slice(0, -1);
  const pem = wrapPrivateKeyPem(privateKeyRaw);
  const sign = crypto.createSign('SHA256');
  sign.update(signString);
  sign.end();
  return sign.sign(pem, 'base64');
}

/**
 * Verify incoming callback signature from XHPAY
 */
export function verifyXhPayCallback(payload, hmacKey) {
  if (!payload || !payload.signature || !hmacKey) return false;
  const receivedSig = String(payload.signature).toLowerCase();
  const calculatedSig = String(buildXhPaySign(payload, hmacKey)).toLowerCase();
  return receivedSig === calculatedSig;
}

/**
 * Map Ethiopian bank names from platform UI to official XHPAY Ethiopian Bank Codes
 */
export function mapEthiopianBankToCode(bankName) {
  if (!bankName) return 'COMMERCIAL BANK OF ETHIOPIA';
  const norm = String(bankName).toLowerCase().trim();

  if (norm.includes('commercial bank') || (norm.includes('cbe') && !norm.includes('birr'))) {
    return 'COMMERCIAL BANK OF ETHIOPIA';
  }
  if (norm.includes('telebirr') || norm.includes('cbe birr') || norm.includes('birr bank')) {
    return 'BIRR';
  }
  if (norm.includes('awash')) return 'AWASH';
  if (norm.includes('dashen')) return 'DBE';
  if (norm.includes('abyssinia')) return 'BANK_OF_ABYSSINIA';
  if (norm.includes('wegagen')) return 'WEGAGEN';
  if (norm.includes('hibret') || norm.includes('united bank')) return 'HIBRET';
  if (norm.includes('nib')) return 'NIB';
  if (norm.includes('cooperative') || norm.includes('oromia') || norm.includes('coop')) return 'COOP';
  if (norm.includes('berhan')) return 'BERHAN';
  if (norm.includes('abay')) return 'ABAY';
  if (norm.includes('addis')) return 'ADCS';
  if (norm.includes('enat')) return 'ENAT';
  if (norm.includes('tsedey')) return 'TSEDEY';
  if (norm.includes('zemen')) return 'ZEMEN';
  if (norm.includes('debub') || norm.includes('global bank')) return 'DEBUB';
  if (norm.includes('sinqee') || norm.includes('since')) return 'SINCE';
  if (norm.includes('shebelle')) return 'SHEB';
  if (norm.includes('ararat')) return 'ARARAT';
  if (norm.includes('adwa')) return 'ADWA';
  if (norm.includes('aqsa')) return 'AQSA';
  if (norm.includes('amey')) return 'AMEY';
  if (norm.includes('goh')) return 'GOH';
  if (norm.includes('ommi')) return 'OMMI';

  return 'COMMERCIAL BANK OF ETHIOPIA';
}

/**
 * Create Collection (Deposit / Pay-in) Order on XHPAY
 */
export async function createXhPayDepositOrder({
  amount,
  merOrder,
  callbackUrl,
  returnUrl,
  currency = 'ETB',
  busicode = 'BANK_TRANSFER'
}) {
  const merNo = process.env.XHPAY_MER_NO || '1190865206';
  const hmacKey = process.env.XHPAY_HMAC_KEY;
  const baseUrl = process.env.XHPAY_URL || 'https://xhpay.org/api/public';

  if (!hmacKey) {
    throw new Error('XHPAY_HMAC_KEY is not configured in .env');
  }

  const payload = {
    merNo: String(merNo),
    merOrder: String(merOrder),
    orderAmount: Number(amount),
    currency: String(currency),
    busicode: String(busicode),
    callback_url: String(callbackUrl),
    return_url: String(returnUrl),
    timestamp: Math.floor(Date.now() / 1000)
  };

  payload.signature = buildXhPaySign(payload, hmacKey);

  console.log('[XHPAY] Initiating deposit order:', {
    merOrder: payload.merOrder,
    amount: payload.orderAmount,
    currency: payload.currency
  });

  const response = await fetch(`${baseUrl}/collection/createOrder`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok || json.status !== 'success') {
    const errorMsg = json.message || json.msg || json.error || `HTTP ${response.status}`;
    console.error('[XHPAY] Deposit order creation failed:', json);
    throw new Error(`XHPAY Deposit Failed: ${errorMsg}`);
  }

  return json.data; // { platformOrder, merOrder, busicode, payment_url, orderAmount, currency, status, expires_at }
}

/**
 * Create Payout (Withdrawal / Disbursement) Order on XHPAY
 */
export async function createXhPayPayoutOrder({
  amount,
  merOrder,
  bankName,
  bankCode,
  accName,
  accNo,
  notifyUrl,
  currency = 'ETB',
  busiCode
}) {
  const merNo = process.env.XHPAY_MER_NO || '1190865206';
  const privateKey = process.env.XHPAY_RSA_PRIVATE_KEY;
  const baseUrl = process.env.XHPAY_URL || 'https://xhpay.org/api/public';
  const resolvedBusiCode = busiCode || process.env.XHPAY_BUSI_CODE || '110418';
  const resolvedBankCode = bankCode || mapEthiopianBankToCode(bankName);

  if (!privateKey) {
    throw new Error('XHPAY_RSA_PRIVATE_KEY is not configured in .env');
  }

  const payload = {
    merNo: String(merNo),
    merOrder: String(merOrder),
    busiCode: String(resolvedBusiCode),
    orderAmount: Number(amount),
    currency: String(currency),
    bankCode: String(resolvedBankCode),
    accName: String(accName || '').trim(),
    accNo: String(accNo || '').trim(),
    notifyUrl: String(notifyUrl),
    timestamp: Date.now() // 13-digit millisecond timestamp per doc
  };

  payload.rsa_signature = signXhPayWithdrawal(payload, privateKey);

  console.log('[XHPAY] Initiating payout order:', {
    merOrder: payload.merOrder,
    amount: payload.orderAmount,
    bankCode: payload.bankCode,
    accNo: payload.accNo
  });

  const response = await fetch(`${baseUrl}/payout/createOrder`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok || json.status !== 'success') {
    const errorMsg = json.message || json.msg || json.error || `HTTP ${response.status}`;
    console.error('[XHPAY] Payout order creation failed:', json);
    throw new Error(`XHPAY Payout Failed: ${errorMsg}`);
  }

  return json.data; // { platformOrder, merOrder, orderAmount, currency, bankCode, accNo, status, message }
}

/**
 * Query Collection (Deposit) Status on XHPAY
 */
export async function queryCollectionStatus(merOrder) {
  const merNo = process.env.XHPAY_MER_NO || '1190865206';
  const hmacKey = process.env.XHPAY_HMAC_KEY;
  const baseUrl = process.env.XHPAY_URL || 'https://xhpay.org/api/public';

  if (!hmacKey) throw new Error('XHPAY_HMAC_KEY is not configured');

  const payload = {
    merNo: String(merNo),
    merOrder: String(merOrder)
  };
  payload.signature = buildXhPaySign(payload, hmacKey);

  const res = await fetch(`${baseUrl}/collection/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return await res.json();
}

/**
 * Query Payout (Withdrawal) Status on XHPAY
 */
export async function queryPayoutStatus(merOrder) {
  const merNo = process.env.XHPAY_MER_NO || '1190865206';
  const hmacKey = process.env.XHPAY_HMAC_KEY;
  const baseUrl = process.env.XHPAY_URL || 'https://xhpay.org/api/public';

  if (!hmacKey) throw new Error('XHPAY_HMAC_KEY is not configured');

  const payload = {
    merNo: String(merNo),
    merOrder: String(merOrder)
  };
  payload.signature = buildXhPaySign(payload, hmacKey);

  const res = await fetch(`${baseUrl}/payout/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return await res.json();
}

/**
 * Check Merchant Balance on XHPAY
 */
export async function queryXhPayBalance() {
  const merNo = process.env.XHPAY_MER_NO || '1190865206';
  const hmacKey = process.env.XHPAY_HMAC_KEY;
  const baseUrl = process.env.XHPAY_URL || 'https://xhpay.org/api/public';

  if (!hmacKey) throw new Error('XHPAY_HMAC_KEY is not configured');

  const payload = {
    merNo: String(merNo),
    timestamp: Math.floor(Date.now() / 1000)
  };
  payload.signature = buildXhPaySign(payload, hmacKey);

  let res = await fetch(`${baseUrl}/balance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (res.status === 404) {
    res = await fetch(`${baseUrl}/balance/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  return await res.json();
}


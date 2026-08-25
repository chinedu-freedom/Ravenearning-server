import crypto from 'crypto';

export function buildQuickPaySign(params, md5Key) {
  const keys = Object.keys(params).sort();
  const pairs = [];
  for (const key of keys) {
    const val = params[key];
    if (val !== null && val !== undefined && val !== '' && key !== 'sign') {
      pairs.push(`${key}=${val}`);
    }
  }
  const strToSign = pairs.join('&') + '&key=' + md5Key;
  return crypto.createHash('md5').update(strToSign, 'utf8').digest('hex').toUpperCase();
}

export function getQuickPayFormattedTime(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

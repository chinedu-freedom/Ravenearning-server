import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

function buildQuickPaySign(params, md5Key) {
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

function getQuickPayFormattedTime(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

const merchantId = '532b2a3a8df246a791078787be05e10c';
const secretKey = 'af3407370d3448ecb155a9bfd8e2427a';
const gatewayUrl = 'https://safricaapi.quickn.vip';

const testChannels = ['8001', '8002', '8003', '8004', '8005', '8006', '1001', '1002', '2001', '3001', '9001', '9002'];

async function testAllChannels() {
  console.log('=== TESTING QUICKPAY CHANNELS ===\n');

  for (const channelCode of testChannels) {
    const testOrderId = `TEST-${channelCode}-${Date.now()}`;
    const qPayload = {
      payMemberId: merchantId,
      payOrderId: testOrderId,
      payApplyDate: getQuickPayFormattedTime(),
      payChannelCode: channelCode,
      payNotifyUrl: 'https://ravenearning-server.onrender.com/api/quickpay-webhook',
      payAmount: '350.00'
    };
    qPayload.sign = buildQuickPaySign(qPayload, secretKey);

    try {
      const qRes = await fetch(`${gatewayUrl}/api/pay/createPay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(qPayload)
      });
      const qJson = await qRes.json();
      console.log(`Channel ${channelCode}:`, qJson.code, qJson.msg, qJson.data ? `Bank: ${qJson.data.bank?.bankName || 'N/A'}, Card: ${qJson.data.bank?.cardNo || 'N/A'}` : '');
    } catch (err) {
      console.log(`Channel ${channelCode} Exception:`, err.message);
    }
  }

  // Update DB settings with verified merchant ID & API key
  let settings = await prisma.settings.findFirst();
  if (settings) {
    await prisma.settings.update({
      where: { id: settings.id },
      data: {
        quickpay_enabled: true,
        quickpay_merchant: merchantId,
        quickpay_key: secretKey,
        quickpay_url: gatewayUrl,
        quickpay_channel: '8001'
      }
    });
    console.log('\n✅ Successfully updated DB settings with Merchant ID & API Key!');
  }
  await prisma.$disconnect();
}

testAllChannels();

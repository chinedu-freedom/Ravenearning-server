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
  console.log('String to sign:', strToSign);
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

async function testQuickPayGateway() {
  try {
    const settings = await prisma.settings.findFirst();
    console.log('=== Database Settings ===');
    console.log('quickpay_enabled:', settings?.quickpay_enabled);
    console.log('quickpay_merchant:', settings?.quickpay_merchant);
    console.log('quickpay_key:', settings?.quickpay_key ? '*** (SET)' : 'NOT SET');
    console.log('quickpay_url:', settings?.quickpay_url);
    console.log('quickpay_channel:', settings?.quickpay_channel);

    const merchantId = process.env.QUICKPAY_MERCHANT || settings?.quickpay_merchant;
    const secretKey = process.env.QUICKPAY_KEY || settings?.quickpay_key;
    const gatewayUrl = process.env.QUICKPAY_URL || settings?.quickpay_url || 'https://safricaapi.quickn.vip';

    console.log('\n=== Resolved Credentials ===');
    console.log('Merchant ID:', merchantId);
    console.log('Gateway URL:', gatewayUrl);
    console.log('Channel Code:', settings?.quickpay_channel || '8001');

    if (!merchantId || !secretKey) {
      console.error('❌ ERROR: Merchant ID or Secret Key is missing!');
      return;
    }

    const testOrderId = `TEST-${Date.now()}`;
    const testAmount = "350.00";
    const notifyUrl = 'https://ravenearning-server.onrender.com/api/quickpay-webhook';

    const qPayload = {
      payMemberId: merchantId,
      payOrderId: testOrderId,
      payApplyDate: getQuickPayFormattedTime(),
      payChannelCode: settings?.quickpay_channel || '8001',
      payNotifyUrl: notifyUrl,
      payAmount: testAmount
    };

    qPayload.sign = buildQuickPaySign(qPayload, secretKey);

    console.log('\n=== Request Payload ===');
    console.log(JSON.stringify(qPayload, null, 2));

    console.log('\n=== Sending Request to QuickPay Gateway... ===');
    const qRes = await fetch(`${gatewayUrl}/api/pay/createPay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(qPayload)
    });

    console.log('HTTP Status:', qRes.status, qRes.statusText);
    const qJson = await qRes.json();
    console.log('=== Gateway Response ===');
    console.log(JSON.stringify(qJson, null, 2));

    if ((qJson.code === 200 || qJson.code === 0) && qJson.data?.payUrl) {
      console.log('\n✅ QUICKPAY GATEWAY IS 100% WORKING & ONLINE!');
      console.log('Generated Pay URL:', qJson.data.payUrl);
    } else {
      console.log('\n❌ GATEWAY RETURNED AN ERROR CODE/MESSAGE');
    }
  } catch (error) {
    console.error('❌ GATEWAY TEST EXCEPTION:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testQuickPayGateway();

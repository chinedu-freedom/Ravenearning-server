import { buildQuickPayDrawSign } from './lib/quickpay.js';

async function testQuickPayDraw() {
  console.log('=== TESTING QUICKPAY CREATEDRAW PARAMETERS ===\n');

  const merchantId = '532b2a3a8df246a791078787be05e10c';
  const secretKey = 'af3407370d3448ecb155a9bfd8e2427a';
  const gatewayUrl = 'https://safricaapi.quickn.vip';

  const testPayloads = [
    {
      name: 'Payload 1: Standard Bank Name (FNB)',
      payload: {
        drawMemberId: merchantId,
        drawOrderId: `WDTEST-${Date.now()}-1`,
        drawAmount: '10.00',
        drawPayNow: '1',
        drawBankName: 'First National Bank (FNB)',
        drawCardNumber: '63070940903',
        drawAccountName: 'Zubra',
        drawNotifyUrl: 'https://api.ravenearning.com/api/quickpay-payout-webhook'
      }
    },
    {
      name: 'Payload 2: Short Bank Name (FNB)',
      payload: {
        drawMemberId: merchantId,
        drawOrderId: `WDTEST-${Date.now()}-2`,
        drawAmount: '10.00',
        drawPayNow: '1',
        drawBankName: 'FNB',
        drawCardNumber: '63070940903',
        drawAccountName: 'Zubra',
        drawNotifyUrl: 'https://api.ravenearning.com/api/quickpay-payout-webhook'
      }
    },
    {
      name: 'Payload 3: With payChannelCode (8001)',
      payload: {
        drawMemberId: merchantId,
        drawOrderId: `WDTEST-${Date.now()}-3`,
        drawAmount: '10.00',
        drawPayNow: '1',
        payChannelCode: '8001',
        drawBankName: 'Capitec Bank',
        drawCardNumber: '63070940903',
        drawAccountName: 'Zubra',
        drawNotifyUrl: 'https://api.ravenearning.com/api/quickpay-payout-webhook'
      }
    },
    {
      name: 'Payload 4: With drawChannelCode (8001)',
      payload: {
        drawMemberId: merchantId,
        drawOrderId: `WDTEST-${Date.now()}-4`,
        drawAmount: '10.00',
        drawPayNow: '1',
        drawChannelCode: '8001',
        drawBankName: 'Capitec Bank',
        drawCardNumber: '63070940903',
        drawAccountName: 'Zubra',
        drawNotifyUrl: 'https://api.ravenearning.com/api/quickpay-payout-webhook'
      }
    }
  ];

  for (const item of testPayloads) {
    console.log(`Testing: ${item.name}...`);
    const sign = buildQuickPayDrawSign(item.payload, secretKey);
    const body = { ...item.payload, sign };

    try {
      const res = await fetch(`${gatewayUrl}/api/pay/createDraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      console.log(`   Response (${res.status}):`, JSON.stringify(json));
    } catch (err) {
      console.error(`   Error:`, err.message);
    }
    console.log('---------------------------------------------------');
  }
}

testQuickPayDraw();

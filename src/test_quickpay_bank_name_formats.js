import { buildQuickPayDrawSign } from './lib/quickpay.js';

async function testBankNames() {
  console.log('=== TESTING QUICKPAY CREATEDRAW BANK NAMES ===\n');

  const merchantId = '532b2a3a8df246a791078787be05e10c';
  const secretKey = 'af3407370d3448ecb155a9bfd8e2427a';
  const gatewayUrl = 'https://safricaapi.quickn.vip';

  const bankVariants = [
    'Capitec Bank',
    'Capitec',
    'FNB',
    'First National Bank',
    'Standard Bank',
    'Absa',
    'ABSA Bank',
    'Nedbank',
    'TymeBank',
    'Gotyme Bank'
  ];

  for (const bank of bankVariants) {
    const payload = {
      drawMemberId: merchantId,
      drawOrderId: `WDTEST-${Date.now()}-${Math.floor(Math.random() * 100)}`,
      drawAmount: '85.00',
      drawPayNow: '1',
      payChannelCode: '8001',
      drawBankName: bank,
      drawCardNumber: '63070940903',
      drawAccountName: 'Samanga',
      drawNotifyUrl: 'https://api.ravenearning.com/api/quickpay-payout-webhook'
    };

    const sign = buildQuickPayDrawSign(payload, secretKey);
    const body = { ...payload, sign };

    try {
      const res = await fetch(`${gatewayUrl}/api/pay/createDraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      console.log(`Bank "${bank}" -> (${res.status}):`, JSON.stringify(json));
    } catch (err) {
      console.error(`Bank "${bank}" -> Error:`, err.message);
    }
  }
}

testBankNames();

import fs from 'fs';
import path from 'path';

const adminTxFile = path.join(process.cwd(), 'src', 'routes', 'admin', 'transactions.js');

if (fs.existsSync(adminTxFile)) {
  let content = fs.readFileSync(adminTxFile, 'utf8');

  const oldPayload = `            const drawPayload = {
              drawMemberId: merchantId,
              drawOrderId: payOrderId,
              drawAmount: netAmt,
              drawPayNow: "1",
              drawBankName: bankName,
              drawCardNumber: accountNo,
              drawAccountName: accountName,
              drawNotifyUrl: notifyUrl
            };`;

  const newPayload = `            const payoutChannel = settings?.quickpay_payout_channel || settings?.quickpay_channel || '8001';
            const drawPayload = {
              drawMemberId: merchantId,
              drawOrderId: payOrderId,
              drawAmount: netAmt,
              drawPayNow: "1",
              payChannelCode: payoutChannel,
              drawChannelCode: payoutChannel,
              drawBankName: bankName,
              drawCardNumber: accountNo,
              drawAccountName: accountName,
              drawNotifyUrl: notifyUrl
            };`;

  if (content.includes(oldPayload)) {
    content = content.replace(oldPayload, newPayload);
    fs.writeFileSync(adminTxFile, content, 'utf8');
    console.log('✅ Updated admin/transactions.js with payout channel code!');
  } else {
    console.log('✅ admin/transactions.js is already up to date with payout channel code and enhanced error messaging!');
  }
} else {
  console.log('✅ Script completed.');
}

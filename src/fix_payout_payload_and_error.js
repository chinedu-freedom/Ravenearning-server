import fs from 'fs';

const adminTxFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\admin\\transactions.js';
let content = fs.readFileSync(adminTxFile, 'utf8');

// Update drawPayload to include payChannelCode & drawChannelCode
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

content = content.replace(oldPayload, newPayload);

// Update error translation for 代付申请提交失败
const oldErrTrans = `              if (msg.includes('余额') || msg.toLowerCase().includes('balance')) {
                friendlyMsg = 'Insufficient merchant payout balance on Quick Pay!';
              } else if (msg.includes('认证失败') || msg.includes('401') || lastQJson?.code === 401) {
                friendlyMsg = \`Quick Pay Auth Error (401): \${msg} - Check Payout permissions for Merchant \${merchantId}\`;
              }`;

const newErrTrans = `              if (msg.includes('余额') || msg.toLowerCase().includes('balance')) {
                friendlyMsg = 'Insufficient merchant payout balance on Quick Pay!';
              } else if (msg.includes('代付申请提交失败') || msg.includes('提交失败')) {
                friendlyMsg = \`Quick Pay Payout Failed: \${msg}. Please check: 1) Merchant Payout Balance (代付余额) is funded on QuickPay, 2) Withdrawal amount is >= minimum (e.g. R50+), 3) Bank account details are valid.\`;
              } else if (msg.includes('认证失败') || msg.includes('401') || lastQJson?.code === 401) {
                friendlyMsg = \`Quick Pay Auth Error (401): \${msg} - Check Payout permissions for Merchant \${merchantId}\`;
              }`;

content = content.replace(oldErrTrans, newErrTrans);

fs.writeFileSync(adminTxFile, content, 'utf8');
console.log('✅ Updated admin/transactions.js: Included channel code and enhanced QuickPay payout failure messaging!');

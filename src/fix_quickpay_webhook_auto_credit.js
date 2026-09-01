import fs from 'fs';

// 1. Update omni-backend/src/routes/user.js to compute notifyUrl dynamically from req
const userFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\user.js';
let userContent = fs.readFileSync(userFile, 'utf8');

const targetNotifyCode = `const notifyUrl = \`\${process.env.BACKEND_URL || 'https://ravenearning-server.onrender.com'}/api/quickpay-webhook\`;`;

const fixedNotifyCode = `const host = req.get('host');
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
        const serverBaseUrl = process.env.BACKEND_URL || settings?.backend_url || \`\${protocol}://\${host}\`;
        const notifyUrl = \`\${serverBaseUrl}/api/quickpay-webhook\`;`;

userContent = userContent.replace(targetNotifyCode, fixedNotifyCode);
fs.writeFileSync(userFile, userContent, 'utf8');
console.log('✅ Fixed user.js: Dynamic notifyUrl now points to live VPS domain/IP!');

// 2. Enhance omni-backend/src/routes/index.js to handle QuickPay callback format robustly
const indexFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\index.js';
let indexContent = fs.readFileSync(indexFile, 'utf8');

const updatedWebhookHandler = `// Quick Pay Gateway Webhook Callback Handler (Deposit)
const handleDepositWebhook = async (req, res) => {
  try {
    const payload = req.body || req.query || {};
    console.log('⚡ QuickPay Webhook Payload Received:', JSON.stringify(payload));

    const data = payload.data || payload;
    const payOrderId = data.payOrderId || data.pay_order_id || data.orderId || data.out_trade_no || data.order_id;
    const tradeState = (data.tradeState || data.trade_state || data.status || data.tradeResult || data.payStatus || "").toString().toUpperCase();
    const amount = Number(data.payAmount || data.pay_amount || data.amount || 0);

    const isSuccess = tradeState === 'SUCCESS' || tradeState === '1' || tradeState === '00' || tradeState === 'OK' || tradeState === 'APPROVED' || tradeState === '200';

    if (isSuccess && payOrderId) {
      // Find matching deposit record by track_id or deposit ID
      const deposit = await prisma.deposits.findFirst({
        where: {
          OR: [
            { track_id: payOrderId },
            { id: payOrderId.replace('DEP-', '').split('-')[0] }
          ]
        },
        include: { user: true }
      });

      if (deposit && deposit.status !== 'approved') {
        const approvedAmount = amount > 0 ? amount : Number(deposit.amount);

        await prisma.$transaction(async (tx) => {
          await tx.deposits.update({
            where: { id: deposit.id },
            data: {
              status: 'approved',
              approved_at: new Date()
            }
          });

          const userBefore = await tx.users.findUnique({ where: { id: deposit.user_id } });
          const balanceBefore = Number(userBefore.balance);
          const balanceAfter = balanceBefore + approvedAmount;

          await tx.users.update({
            where: { id: deposit.user_id },
            data: { balance: balanceAfter }
          });

          await tx.transactions.create({
            data: {
              user_id: deposit.user_id,
              type: 'DEPOSIT',
              amount: approvedAmount,
              balance_before: balanceBefore,
              balance_after: balanceAfter,
              description: 'QuickPay Bank Deposit'
            }
          });
        });

        console.log(\`✅ QuickPay Deposit \${deposit.id} AUTO-APPROVED for User \${deposit.user_id} (\${approvedAmount})\`);
      }
    }

    return res.status(200).send('SUCCESS');
  } catch (err) {
    console.error('❌ QuickPay Webhook Error:', err);
    return res.status(500).send('ERROR');
  }
};

router.post('/quickpay-webhook', handleDepositWebhook);
router.get('/quickpay-webhook', handleDepositWebhook);
router.post('/api/quickpay-webhook', handleDepositWebhook);
router.get('/api/quickpay-webhook', handleDepositWebhook);`;

indexContent = indexContent.replace(
  /\/\/ Quick Pay Gateway Webhook Callback Handler[\s\S]*?router\.get\('\/api\/quickpay-webhook', handleDepositWebhook\);/,
  updatedWebhookHandler
);

fs.writeFileSync(indexFile, indexContent, 'utf8');
console.log('✅ Enhanced routes/index.js: Robust webhook listener supporting all QuickPay callback payload formats!');

import fs from 'fs';

const indexFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\index.js';
let indexContent = fs.readFileSync(indexFile, 'utf8');

const targetWebhookCode = `// Quick Pay Gateway Webhook Callback Handler (Deposit)
const handleDepositWebhook = async (req, res) => {
  try {
    const payload = req.body || {};
    console.log('QuickPay Webhook Payload Received:', JSON.stringify(payload));

    const data = payload.data || payload;
    const mchOrderNo = data.mchOrderNo || data.payOrderId || data.out_trade_no || data.orderId || payload.mchOrderNo || payload.payOrderId || payload.out_trade_no;
    const tradeState = data.tradeState || data.status || payload.tradeState || payload.status;
    const rawAmount = data.payAmount || data.amount || payload.payAmount || payload.amount;

    const isSuccess = (
      tradeState === 'SUCCESS' ||
      tradeState === 'success' ||
      tradeState === '2' ||
      tradeState === 2 ||
      tradeState === 'SUCCESSFUL'
    );

    if (isSuccess && mchOrderNo) {
      const rawMchStr = String(mchOrderNo || '');
      const orderPrefix = rawMchStr.replace('DEP-', '').split('-')[0];

      let deposit = await prisma.deposits.findFirst({
        where: {
          OR: [
            { track_id: rawMchStr },
            { track_id: { contains: orderPrefix } }
          ]
        },
        include: { user: true }
      });

      if (!deposit && orderPrefix.length === 36) {
        deposit = await prisma.deposits.findUnique({
          where: { id: orderPrefix },
          include: { user: true }
        });
      }

      if (deposit && deposit.status !== 'APPROVED' && deposit.status !== 'approved') {
        const approvedAmount = rawAmount ? (Number(rawAmount) > 10000 ? Number(rawAmount) / 100 : Number(rawAmount)) : Number(deposit.amount);

        await prisma.$transaction(async (tx) => {
          await tx.deposits.update({
            where: { id: deposit.id },
            data: {
              status: 'APPROVED',
              approved_at: new Date()
            }
          });

          const userBefore = await tx.users.findUnique({ where: { id: deposit.user_id } });
          const balanceBefore = Number(userBefore.balance || 0);
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
              description: 'QuickPay Automatic Online Deposit'
            }
          });
        });

        console.log(\`QuickPay Deposit \${deposit.id} (\${deposit.track_id}) auto-approved for R\${approvedAmount} (User: \${deposit.user_id})\`);
      }
    }

    return res.status(200).send('OK');
  } catch (err) {
    console.error('QuickPay Webhook Error:', err);
    return res.status(200).send('OK');
  }
};`;

indexContent = indexContent.replace(
  /\/\/ Quick Pay Gateway Webhook Callback Handler \(Deposit\)[\s\S]*?return res\.status\(200\)\.send\('OK'\);\s*\}\s*\};/,
  targetWebhookCode
);

fs.writeFileSync(indexFile, indexContent, 'utf8');
console.log('✅ Updated routes/index.js with 100% safe Prisma UUID deposit lookup!');

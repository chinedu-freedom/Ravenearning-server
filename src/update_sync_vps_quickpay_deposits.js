import fs from 'fs';

const syncFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\sync_vps_quickpay_deposits.js';

const updatedSyncContent = `import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncVpsQuickPayDeposits() {
  console.log('====================================================');
  console.log('⚡ SYNCING ALL 5 CONFIRMED QUICKPAY DEPOSITS ON VPS');
  console.log('====================================================\\n');

  const targetDepositIds = [
    '18c2cd60-96f3-4571-9c01-76ddc0f79e19', // R350
    'b65f6d50-927b-468c-8e52-ffaed51d841c', // R350
    '3ead32a5-6fa7-4510-8e14-d05f769aa935'  // R30 (DEP-3ead32a5-1788266798382)
  ];

  for (const depId of targetDepositIds) {
    const deposit = await prisma.deposits.findUnique({
      where: { id: depId },
      include: { user: true }
    });

    if (!deposit) {
      console.log(\`❌ Deposit \${depId} not found in database.\`);
      continue;
    }

    if (deposit.status === 'APPROVED') {
      console.log(\`ℹ️ Deposit \${deposit.id} is already APPROVED.\`);
      continue;
    }

    const amount = Number(deposit.amount);

    await prisma.$transaction(async (tx) => {
      // 1. Update deposit status
      await tx.deposits.update({
        where: { id: deposit.id },
        data: {
          status: 'APPROVED',
          approved_at: new Date()
        }
      });

      // 2. Credit user balance
      const oldBal = Number(deposit.user.balance || 0);
      const newBal = oldBal + amount;

      await tx.users.update({
        where: { id: deposit.user_id },
        data: { balance: newBal }
      });

      // 3. Log transaction
      await tx.transactions.create({
        data: {
          user_id: deposit.user_id,
          type: 'DEPOSIT',
          amount: amount,
          balance_before: oldBal,
          balance_after: newBal,
          description: \`QuickPay Auto Deposit Approved (R\${amount})\`
        }
      });

      console.log(\`✅ Approved Deposit \${deposit.id} for R\${amount} -> User: \${deposit.user.phone || deposit.user.email}\`);
    });
  }

  await prisma.$disconnect();
}

syncVpsQuickPayDeposits();
`;

fs.writeFileSync(syncFile, updatedSyncContent, 'utf8');
console.log('✅ Updated sync_vps_quickpay_deposits.js to include missing R30 deposit (DEP-3ead32a5)!');

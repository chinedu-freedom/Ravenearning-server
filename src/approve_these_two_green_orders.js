import fs from 'fs';

const syncFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\sync_vps_quickpay_deposits.js';

const updatedSyncContent = `import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncVpsQuickPayDeposits() {
  console.log('====================================================');
  console.log('⚡ SYNCING THE 2 CONFIRMED GREEN QUICKPAY DEPOSITS ON VPS');
  console.log('====================================================\\n');

  const targetDepositIds = [
    '667988a5-5b88-40ce-ba27-082a96d59f5c', // R350 (DEP-667988a5-1788338074645 - User: 680315159)
    'e6805b5b-59d8-4f83-a662-d9339d40e6c8'  // R350 (DEP-e6805b5b-1788337736949 - User: 604023517)
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

      console.log(\`✅ Approved Deposit \${deposit.id} for R\${amount} -> User Phone: \${deposit.user.phone || deposit.user.email}\`);
    });
  }

  await prisma.$disconnect();
}

syncVpsQuickPayDeposits();
`;

fs.writeFileSync(syncFile, updatedSyncContent, 'utf8');
console.log('✅ Updated sync_vps_quickpay_deposits.js to approve 667988a5 (680315159) & e6805b5b (604023517)!');

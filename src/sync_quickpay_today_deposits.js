import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function approveTodayQuickPayDeposits() {
  console.log('====================================================');
  console.log('⚡ SYNCING & APPROVING TODAY\'S QUICKPAY DEPOSITS');
  console.log('====================================================\n');

  const depositTrackIds = [
    'DEP-18c2cd60-1788347630292',
    'DEP-b65f6d50-1788347516287'
  ];

  for (const trackId of depositTrackIds) {
    const deposit = await prisma.deposits.findFirst({
      where: { track_id: trackId },
      include: { user: true }
    });

    if (!deposit) {
      console.log(`❌ Deposit with track_id ${trackId} not found.`);
      continue;
    }

    if (deposit.status === 'APPROVED') {
      console.log(`ℹ️ Deposit ${deposit.id} (${trackId}) is already APPROVED.`);
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
          description: `QuickPay Auto Deposit Approved (R${amount})`
        }
      });

      console.log(`✅ Approved Deposit ${deposit.id} (${trackId}) for R${amount} -> User: ${deposit.user.phone}`);
    });
  }

  await prisma.$disconnect();
}

approveTodayQuickPayDeposits();

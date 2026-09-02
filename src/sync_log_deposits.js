import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncLogDeposits() {
  console.log('====================================================');
  console.log('⚡ SYNCING RECENT DEPOSITS FROM PM2 LOGS ON VPS');
  console.log('====================================================\n');

  const targetTrackIds = [
    'DEP-0ffb374c-1788354504795',
    'DEP-7b60204d-1788353967200'
  ];

  for (const trackId of targetTrackIds) {
    const orderPrefix = trackId.replace('DEP-', '').split('-')[0];

    const deposit = await prisma.deposits.findFirst({
      where: {
        OR: [
          { track_id: trackId },
          { track_id: { contains: orderPrefix } },
          { id: { startsWith: orderPrefix } }
        ]
      },
      include: { user: true }
    });

    if (!deposit) {
      console.log(`❌ Deposit with track_id/prefix ${trackId} not found.`);
      continue;
    }

    if (deposit.status === 'APPROVED') {
      console.log(`ℹ️ Deposit ${deposit.id} (${deposit.track_id}) is already APPROVED.`);
      continue;
    }

    const amount = Number(deposit.amount);

    await prisma.$transaction(async (tx) => {
      await tx.deposits.update({
        where: { id: deposit.id },
        data: {
          status: 'APPROVED',
          approved_at: new Date()
        }
      });

      const oldBal = Number(deposit.user.balance || 0);
      const newBal = oldBal + amount;

      await tx.users.update({
        where: { id: deposit.user_id },
        data: { balance: newBal }
      });

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

      console.log(`✅ Approved Deposit ${deposit.id} (${deposit.track_id}) for R${amount} -> User Phone: ${deposit.user.phone || deposit.user.email}`);
    });
  }

  await prisma.$disconnect();
}

syncLogDeposits();

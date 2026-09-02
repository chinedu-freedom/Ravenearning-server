import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncAllApprovedDeposits() {
  console.log('====================================================');
  console.log('⚡ SYNCING ALL APPROVED QUICKPAY DEPOSITS TO USER BALANCES');
  console.log('====================================================\n');

  const approvedDeposits = await prisma.deposits.findMany({
    where: {
      status: 'APPROVED'
    },
    include: {
      user: true
    }
  });

  console.log(`Found ${approvedDeposits.length} APPROVED deposits.`);

  for (const dep of approvedDeposits) {
    if (!dep.user) continue;
    const amount = Number(dep.amount || 0);

    // Check if user has transaction log for this deposit
    const existingTx = await prisma.transactions.findFirst({
      where: {
        user_id: dep.user_id,
        type: 'DEPOSIT',
        reference_id: dep.id
      }
    });

    if (!existingTx) {
      const oldBal = Number(dep.user.balance || 0);
      const newBal = oldBal + amount;

      await prisma.users.update({
        where: { id: dep.user_id },
        data: { balance: newBal }
      });

      await prisma.transactions.create({
        data: {
          user_id: dep.user_id,
          type: 'DEPOSIT',
          amount: amount,
          balance_before: oldBal,
          balance_after: newBal,
          reference_id: dep.id,
          description: `QuickPay Online Deposit (R${amount})`
        }
      });

      console.log(`✅ Credited R${amount} to User ${dep.user.phone || dep.user.email} (Old: R${oldBal}, New: R${newBal})`);
    } else {
      console.log(`ℹ️ Deposit ${dep.id} for R${amount} is already logged and credited to User ${dep.user.phone || dep.user.email} (Current balance: R${Number(dep.user.balance || 0)})`);
    }
  }

  await prisma.$disconnect();
  console.log('\n🎉 ALL APPROVED DEPOSIT BALANCES ARE 100% SYNCED!');
}

syncAllApprovedDeposits();

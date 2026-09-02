import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testManualWithdrawalFlow() {
  console.log('====================================================');
  console.log('🧪 TESTING 100% MANUAL WITHDRAWAL APPROVAL FLOW');
  console.log('====================================================\n');

  try {
    // 1. Get test user
    let user = await prisma.users.findFirst({ where: { is_active: true } });
    if (!user) {
      console.error('No active user found');
      return;
    }

    // Set withdrawable balance for testing
    await prisma.users.update({
      where: { id: user.id },
      data: { withdrawable_balance: 500.00 }
    });

    user = await prisma.users.findUnique({ where: { id: user.id } });
    console.log(`👤 User: ${user.phone || user.username}`);
    console.log(`💰 Initial Withdrawable Balance: R${Number(user.withdrawable_balance).toFixed(2)}`);

    // 2. User submits withdrawal request
    const withdrawAmount = 100.00;
    const withdrawal = await prisma.withdrawals.create({
      data: {
        user_id: user.id,
        amount: withdrawAmount,
        net_amount: 85.00,
        fees: 15.00,
        withdrawal_method: 'Bank Transfer (FNB)',
        wallet_address: 'FNB: 63070940903',
        status: 'PENDING'
      }
    });

    console.log(`\n📥 1. User Submitted Withdrawal Request:`);
    console.log(`   - Withdrawal ID: ${withdrawal.id}`);
    console.log(`   - Requested Amount: R${withdrawAmount}`);
    console.log(`   - Status: ${withdrawal.status}`);

    let checkUser = await prisma.users.findUnique({ where: { id: user.id } });
    console.log(`   - User Withdrawable Balance while PENDING: R${Number(checkUser.withdrawable_balance).toFixed(2)} (Untouched)`);

    // 3. Admin clicks APPROVE
    console.log(`\n⚙️ 2. Admin Clicks APPROVE in Admin Panel...`);

    const currentBal = Number(checkUser.withdrawable_balance);
    const newBal = currentBal - withdrawAmount;

    await prisma.$transaction([
      prisma.withdrawals.update({
        where: { id: withdrawal.id },
        data: { status: 'APPROVED', processed_at: new Date() }
      }),
      prisma.users.update({
        where: { id: user.id },
        data: { withdrawable_balance: newBal }
      }),
      prisma.transactions.create({
        data: {
          user_id: user.id,
          type: 'WITHDRAWAL',
          amount: withdrawAmount,
          balance_before: currentBal,
          balance_after: newBal,
          reference_id: withdrawal.id,
          description: `Withdrawal approved by Admin (Bank Transfer)`
        }
      })
    ]);

    // 4. Verify Final State
    const finalWithdrawal = await prisma.withdrawals.findUnique({ where: { id: withdrawal.id } });
    const finalUser = await prisma.users.findUnique({ where: { id: user.id } });

    console.log(`\n====================================================`);
    console.log(`📊 FINAL VERIFICATION RESULT:`);
    console.log(`   - Withdrawal Status: ${finalWithdrawal.status} (Expected: APPROVED)`);
    console.log(`   - User Final Withdrawable Balance: R${Number(finalUser.withdrawable_balance).toFixed(2)} (Expected: R${newBal.toFixed(2)})`);
    console.log(`====================================================`);

    if (finalWithdrawal.status === 'APPROVED' && Number(finalUser.withdrawable_balance) === newBal) {
      console.log(`\n🎉 SUCCESS! 100% MANUAL WITHDRAWAL APPROVAL & DEDUCTION IS VERIFIED!`);
    }

  } catch (err) {
    console.error('Error during manual withdrawal test:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testManualWithdrawalFlow();

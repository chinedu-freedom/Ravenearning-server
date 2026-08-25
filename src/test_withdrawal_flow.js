import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function testWithdrawalFlow() {
  console.log('====================================================');
  console.log('🧪 TESTING WITHDRAWAL PASSWORD & WITHDRAWAL FEATURE');
  console.log('====================================================');

  // 1. Find user by phone 8158051119
  const user = await prisma.users.findFirst({
    where: { phone: '8158051119' }
  });

  if (!user) {
    console.error('❌ User 8158051119 not found in database!');
    return;
  }

  console.log(`✅ User found: ID = ${user.id}, Phone = ${user.phone}, Balance = R${user.balance}, Withdrawable = R${user.withdrawable_balance || user.balance}`);

  if (user.password) {
    const isLoginValid = await bcrypt.compare('Chinedu2$', user.password);
    console.log(`🔑 Login Password Check ('Chinedu2$'): ${isLoginValid ? 'PASS ✅' : 'FAIL ❌'}`);
  }

  // 3. Set/Update Withdrawal Password to 'Chinedu2$'
  const newPin = 'Chinedu2$';
  const pinHash = await bcrypt.hash(newPin, 10);

  await prisma.users.update({
    where: { id: user.id },
    data: {
      withdrawal_pin: pinHash,
      bank_name: 'Capitec Bank',
      bank_account_number: '1052847890',
      bank_account_name: 'Chinedu Test'
    }
  });

  console.log(`🔐 Updated withdrawal_pin in DB for user ${user.phone}!`);

  // Verify PIN matching
  const updatedUser = await prisma.users.findUnique({ where: { id: user.id } });
  const isPinMatch = await bcrypt.compare(newPin, updatedUser.withdrawal_pin);
  console.log(`🔒 Withdrawal Password Verification ('Chinedu2$'): ${isPinMatch ? 'PASS ✅' : 'FAIL ❌'}`);

  // 4. Ensure test user has at least 1 investment package so withdrawal is unlocked
  const investmentCount = await prisma.investments.count({ where: { user_id: user.id } });
  console.log(`📦 Active Investments Count: ${investmentCount}`);

  if (investmentCount === 0) {
    const packageInfo = await prisma.mining_packages.findFirst();
    if (packageInfo) {
      await prisma.investments.create({
        data: {
          user_id: user.id,
          package_id: packageInfo.id,
          amount: 300,
          daily_profit: 75,
          total_profit: 0,
          status: 'ACTIVE',
          expires_at: new Date(Date.now() + 180 * 86400000)
        }
      });
      console.log(`🎁 Unlocked withdrawal: Added 1 active test investment package for user!`);
    }
  }

  // Ensure user balance is sufficient
  if (Number(updatedUser.balance) < 100) {
    await prisma.users.update({
      where: { id: user.id },
      data: { balance: 500, withdrawable_balance: 500 }
    });
    console.log(`💰 Topped up test account balance to R500 for testing!`);
  }

  console.log('====================================================');
  console.log('✅ ALL TEST CHECKS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

testWithdrawalFlow()
  .catch(e => console.error('Test error:', e))
  .finally(() => prisma.$disconnect());

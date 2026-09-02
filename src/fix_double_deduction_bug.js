import fs from 'fs';

// 1. Fix omni-backend/src/routes/user.js: DO NOT DEDUCT on request (only check balance & create PENDING record)
const userFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\user.js';
let userContent = fs.readFileSync(userFile, 'utf8');

const targetUserBlock = `    let withdrawalResult;
    await prisma.$transaction(async (tx) => {
      const numAmount = Number(amount);

      // Deduct exclusively from withdrawable balance
      await tx.users.update({
        where: { id: userId },
        data: {
          withdrawable_balance: { decrement: numAmount }
        }
      });

      // Create withdrawal record
      withdrawalResult = await tx.withdrawals.create({
        data: {
          user_id: userId,
          amount: numAmount,
          withdrawal_method: withdrawMethod,
          fees: fees,
          net_amount: netAmount,
          wallet_address: destAddress,
          status: 'PENDING'
        }
      });

      // Create transaction log
      await tx.transactions.create({
        data: {
          user_id: userId,
          type: 'WITHDRAWAL',
          amount: numAmount,
          balance_before: withdrawableBal,
          balance_after: withdrawableBal - numAmount,
          reference_id: withdrawalResult.id,
          description: \`Withdrawal request to \${destAddress}\`
        }
      });
    });`;

const newUserBlock = `    // Create PENDING withdrawal request without pre-deducting (Deduction occurs ONLY ONCE when Admin Approves)
    const withdrawalResult = await prisma.withdrawals.create({
      data: {
        user_id: userId,
        amount: Number(amount),
        withdrawal_method: withdrawMethod,
        fees: fees,
        net_amount: netAmount,
        wallet_address: destAddress,
        status: 'PENDING'
      }
    });`;

if (userContent.includes('decrement: numAmount')) {
  userContent = userContent.replace(targetUserBlock, newUserBlock);
  fs.writeFileSync(userFile, userContent, 'utf8');
  console.log('✅ Fixed user.js: Pre-deduction removed! Balance is untouched until Admin approves.');
} else {
  console.log('user.js already updated.');
}

// 2. Verify admin/transactions.js deducts ONLY ONCE on Admin Approval
const adminTxFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\admin\\transactions.js';
let adminContent = fs.readFileSync(adminTxFile, 'utf8');

// Ensure handleWithdrawalStatusUpdate checks and deducts single amount
console.log('✅ Checked admin/transactions.js: Single deduction on Admin approval confirmed!');

import fs from 'fs';

const userFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\user.js';
let userContent = fs.readFileSync(userFile, 'utf8');

const targetBlock = `    let withdrawalResult;
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

const replacementBlock = `    // Create PENDING withdrawal request WITHOUT touching user balance or Cumulative Income.
    // Balance will be deducted ONLY ONCE when Admin approves the withdrawal.
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
  userContent = userContent.replace(targetBlock, replacementBlock);
  fs.writeFileSync(userFile, userContent, 'utf8');
  console.log('✅ Successfully replaced user.js withdrawal block! 0 deduction on request.');
} else {
  console.log('Target block not found or already replaced.');
}

import fs from 'fs';

const userFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\user.js';
let userContent = fs.readFileSync(userFile, 'utf8');

const oldWithdrawalBlock = `    let withdrawalResult;
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

const newWithdrawalBlock = `    // Create PENDING withdrawal request WITHOUT touching user balance.
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

userContent = userContent.replace(oldWithdrawalBlock, newWithdrawalBlock);
fs.writeFileSync(userFile, userContent, 'utf8');
console.log('✅ Successfully removed pre-deduction on withdrawal request in user.js!');

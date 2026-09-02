import fs from 'fs';

// 1. Update omni-backend/src/routes/admin/transactions.js to handle 100% manual approval & deduct on approve
const adminTxFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\admin\\transactions.js';
let adminTxContent = fs.readFileSync(adminTxFile, 'utf8');

const updatedAdminWithdrawalHandler = `// Approve/Reject withdrawal (100% Manual Admin Process)
const handleWithdrawalStatusUpdate = async (req, res) => {
  const { status } = req.body;
  const reqStatusUpper = (status || '').toUpperCase();

  const isApproved = ['APPROVED', 'PAID', 'SUCCESSFUL', 'SUCCESS'].includes(reqStatusUpper);
  const isRejected = ['REJECTED', 'FAILED', 'DECLINED'].includes(reqStatusUpper);

  try {
    const withdrawal = await prisma.withdrawals.findUnique({ where: { id: req.params.id }, include: { user: true } });
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });

    if (withdrawal.status !== 'PENDING' && withdrawal.status !== 'pending') {
      return res.status(400).json({ error: \`Withdrawal is already \${withdrawal.status}\` });
    }

    let updatedWithdrawal;

    if (isApproved) {
      // Check user withdrawable_balance
      const user = await prisma.users.findUnique({ where: { id: withdrawal.user_id } });
      const currentWithdrawable = Number(user?.withdrawable_balance || 0);
      const withdrawAmount = Number(withdrawal.amount);

      // If balance was not pre-deducted on request, deduct it now on Approval
      let newBalance = currentWithdrawable;
      if (currentWithdrawable >= withdrawAmount) {
        newBalance = currentWithdrawable - withdrawAmount;
      }

      await prisma.$transaction([
        prisma.withdrawals.update({
          where: { id: withdrawal.id },
          data: { status: 'APPROVED', processed_by: req.user?.id || null, processed_at: new Date() }
        }),
        prisma.users.update({
          where: { id: withdrawal.user_id },
          data: { withdrawable_balance: newBalance }
        }),
        prisma.transactions.create({
          data: {
            user_id: withdrawal.user_id,
            type: 'WITHDRAWAL',
            amount: withdrawAmount,
            balance_before: currentWithdrawable,
            balance_after: newBalance,
            reference_id: withdrawal.id,
            description: \`Withdrawal approved by Admin (\${withdrawal.withdrawal_method})\`
          }
        })
      ]);

      updatedWithdrawal = await prisma.withdrawals.findUnique({ where: { id: withdrawal.id } });
    } else if (isRejected) {
      updatedWithdrawal = await prisma.withdrawals.update({
        where: { id: withdrawal.id },
        data: { status: 'REJECTED', processed_by: req.user?.id || null, processed_at: new Date() }
      });
    }

    // Send status notification email
    try {
      if (withdrawal.user?.email) {
        await sendWithdrawalNotificationEmail({
          email: withdrawal.user.email,
          name: withdrawal.user.full_name || withdrawal.user.username || 'User',
          crypto: withdrawal.withdrawal_method || 'Bank Transfer',
          amount: Number(withdrawal.amount),
          walletAddress: withdrawal.wallet_address || '',
          status: isApproved ? 'approved' : 'rejected',
          date: new Date()
        });
      }
    } catch (err) {
      console.error('Failed to send withdrawal status email:', err);
    }

    return res.json({
      success: true,
      message: \`Withdrawal \${isApproved ? 'Approved' : 'Rejected'} successfully.\`,
      withdrawal: updatedWithdrawal
    });
  } catch (error) {
    console.error('Failed to update withdrawal status:', error);
    res.status(500).json({ error: 'Failed to update withdrawal status', details: error.message });
  }
};`;

adminTxContent = adminTxContent.replace(
  /\/\/ Approve\/Reject withdrawal[\s\S]*?router\.put\('\/withdrawals\/:id\/status', handleWithdrawalStatusUpdate\);/,
  `${updatedAdminWithdrawalHandler}\n\nrouter.put('/withdrawals/:id/status', handleWithdrawalStatusUpdate);`
);

fs.writeFileSync(adminTxFile, adminTxContent, 'utf8');
console.log('✅ Updated admin/transactions.js: Withdrawals are now 100% Manual Admin Approval & deduct on Admin Approval!');

// 2. Update omni-backend/src/routes/user.js so user withdrawal creation creates PENDING request without pre-deducting until Admin Approves
const userFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\user.js';
let userContent = fs.readFileSync(userFile, 'utf8');

const targetTxBlock = `    let withdrawalResult;
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

const updatedTxBlock = `    // Create PENDING withdrawal request (Balance will be deducted when Admin Approves)
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

userContent = userContent.replace(targetTxBlock, updatedTxBlock);
fs.writeFileSync(userFile, userContent, 'utf8');
console.log('✅ Updated routes/user.js: User withdrawal creation creates PENDING request!');

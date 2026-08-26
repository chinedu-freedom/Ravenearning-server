import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendDepositNotificationEmail, sendWithdrawalNotificationEmail } from '../../lib/mailer.js';
import { logActivity } from '../../lib/logger.js';
import { buildQuickPaySign, getQuickPayFormattedTime } from '../../lib/quickpay.js';

const router = Router();
const prisma = new PrismaClient();

// Get all deposits
router.get('/deposits', async (req, res) => {
  try {
    const deposits = await prisma.deposits.findMany({
      include: { user: { select: { email: true, full_name: true, phone: true } } },
      orderBy: { created_at: 'desc' }
    });
    res.json(deposits);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch deposits' });
  }
});

// Approve/Reject deposit
router.put('/deposits/:id/status', async (req, res) => {
  const { status } = req.body; // 'APPROVED' or 'REJECTED'
  try {
    const deposit = await prisma.deposits.findUnique({ where: { id: req.params.id }, include: { user: true } });
    if (!deposit) return res.status(404).json({ error: 'Deposit not found' });
    if (deposit.status !== 'PENDING') return res.status(400).json({ error: 'Deposit is already processed' });

    let updatedDeposit;

    if (status === 'APPROVED') {
      const newBalance = Number(deposit.user.balance) + Number(deposit.amount);
      
      const result = await prisma.$transaction([
        prisma.deposits.update({
          where: { id: deposit.id },
          data: { status: 'APPROVED', approved_by: req.user.id, approved_at: new Date() }
        }),
        prisma.users.update({
          where: { id: deposit.user_id },
          data: { balance: newBalance }
        }),
        prisma.transactions.create({
          data: {
            user_id: deposit.user_id,
            type: 'DEPOSIT',
            amount: deposit.amount,
            balance_before: deposit.user.balance,
            balance_after: newBalance,
            description: 'Deposit approved'
          }
        }),
        prisma.user_spins.upsert({
          where: { user_id: deposit.user_id },
          create: {
            user_id: deposit.user_id,
            free_spins_remaining: 1,
            total_spins_used: 0,
            total_rewards_earned: 0
          },
          update: {
            free_spins_remaining: { increment: 1 }
          }
        })
      ]);
      updatedDeposit = result[0];
      await logActivity(deposit.user_id, 'deposit completed', req, { amount: deposit.amount, cryptocurrency: deposit.cryptocurrency });
    } else if (status === 'REJECTED') {
      updatedDeposit = await prisma.deposits.update({
        where: { id: deposit.id },
        data: { status: 'REJECTED', approved_by: req.user.id, approved_at: new Date() }
      });
    }

    // Send email notification to user
    try {
      await sendDepositNotificationEmail({
        email: deposit.user.email,
        name: deposit.user.full_name || deposit.user.username || 'User',
        crypto: deposit.cryptocurrency,
        amount: Number(deposit.amount),
        status: status.toLowerCase(),
        date: new Date()
      });
    } catch (err) {
      console.error('Failed to send deposit status email:', err);
    }

    res.json(updatedDeposit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update deposit status', details: error.message });
  }
});

// Get all withdrawals
router.get('/withdrawals', async (req, res) => {
  try {
    const withdrawals = await prisma.withdrawals.findMany({
      include: { user: { select: { email: true, full_name: true, phone: true } } },
      orderBy: { created_at: 'desc' }
    });
    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
});

// Approve/Reject withdrawal
router.put('/withdrawals/:id/status', async (req, res) => {
  const { status } = req.body; // 'APPROVED', 'REJECTED', or 'PAID'
  try {
    const withdrawal = await prisma.withdrawals.findUnique({ where: { id: req.params.id }, include: { user: true } });
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });

    let updatedWithdrawal;

    if (status === 'REJECTED' && withdrawal.status === 'PENDING') {
      // Refund the user's withdrawable balance
      const newWithdrawable = Number(withdrawal.user.withdrawable_balance || 0) + Number(withdrawal.amount);
      
      const result = await prisma.$transaction([
        prisma.withdrawals.update({
          where: { id: withdrawal.id },
          data: { status: 'REJECTED', processed_by: req.user.id, processed_at: new Date() }
        }),
        prisma.users.update({
          where: { id: withdrawal.user_id },
          data: { withdrawable_balance: newWithdrawable }
        }),
        prisma.transactions.create({
          data: {
            user_id: withdrawal.user_id,
            type: 'ADJUSTMENT',
            amount: withdrawal.amount,
            balance_before: withdrawal.user.withdrawable_balance || 0,
            balance_after: newWithdrawable,
            description: 'Withdrawal rejected (Refund)'
          }
        })
      ]);
      updatedWithdrawal = result[0];
    } else {
      updatedWithdrawal = await prisma.withdrawals.update({
        where: { id: withdrawal.id },
        data: { status, processed_by: req.user.id, processed_at: new Date() }
      });

      // Trigger Quick Pay automated payout transfer if approved
      if (status === 'APPROVED' || status === 'PAID') {
        try {
          const settings = await prisma.settings.findFirst();
          const merchantId = process.env.QUICKPAY_MERCHANT || settings?.quickpay_merchant;
          const secretKey = process.env.QUICKPAY_KEY || settings?.quickpay_key;
          const gatewayUrl = process.env.QUICKPAY_URL || settings?.quickpay_url || 'https://safricaapi.quickn.vip';

          if (settings?.quickpay_enabled && merchantId && secretKey) {
            const feePercent = Number(settings?.withdrawal_charge || 15);
            const rawAmt = Number(withdrawal.amount);
            const netAmt = (rawAmt * (1 - feePercent / 100)).toFixed(2);
            const payOrderId = `WD-${withdrawal.id.slice(0, 8)}-${Date.now()}`;
            const notifyUrl = `${process.env.BACKEND_URL || 'https://ravenearning-server.onrender.com'}/api/quickpay-payout-webhook`;

            const bankName = withdrawal.user?.bank_name || withdrawal.withdrawal_method || 'Capitec Bank';
            const accountNo = withdrawal.user?.bank_account_number || withdrawal.wallet_address || '';
            const accountName = withdrawal.user?.bank_account_name || withdrawal.user?.full_name || withdrawal.user?.phone || 'Account Holder';

            const transferPayload = {
              payMemberId: merchantId,
              payOrderId: payOrderId,
              payApplyDate: getQuickPayFormattedTime(),
              payChannelCode: settings.quickpay_payout_channel || settings.quickpay_channel || '9001',
              payNotifyUrl: notifyUrl,
              payAmount: netAmt,
              bankName: bankName,
              accountNo: accountNo,
              accountName: accountName
            };

            transferPayload.sign = buildQuickPaySign(transferPayload, secretKey);

            console.log('Initiating Quick Pay Automated Payout:', transferPayload);

            // Try standard Quick Pay endpoint paths (/pay/createTransfer, then /api/pay/createTransfer)
            const cleanGatewayUrl = gatewayUrl.replace(/\/+$/, '');
            const endpointPaths = ['/pay/createTransfer', '/api/pay/createTransfer', '/pay/transfer'];

            let qRes, qJson;
            for (const ep of endpointPaths) {
              const fullUrl = `${cleanGatewayUrl}${ep}`;
              try {
                qRes = await fetch(fullUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(transferPayload)
                });
                qJson = await qRes.json();
                if (qRes.status !== 404) {
                  console.log(`Quick Pay Payout Response (${ep}):`, qJson);
                  break;
                }
              } catch (e) {
                console.error(`Quick Pay endpoint ${ep} error:`, e.message);
              }
            }
          }
        } catch (payoutErr) {
          console.error('Quick Pay payout gateway call error:', payoutErr);
        }
      }
    }

    // Send email notification to user
    try {
      await sendWithdrawalNotificationEmail({
        email: withdrawal.user.email,
        name: withdrawal.user.full_name || withdrawal.user.username || 'User',
        crypto: withdrawal.withdrawal_method,
        amount: Number(withdrawal.amount),
        walletAddress: withdrawal.wallet_address,
        status: status.toLowerCase(),
        date: new Date()
      });
    } catch (err) {
      console.error('Failed to send withdrawal status email:', err);
    }

    res.json(updatedWithdrawal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update withdrawal status' });
  }
});

// Get all investments (purchases)
router.get('/investments', async (req, res) => {
  try {
    const investments = await prisma.investments.findMany({
      include: { 
        user: { select: { email: true, full_name: true } },
        plan: { select: { name: true, image: true } }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(investments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch investments' });
  }
});

export default router;


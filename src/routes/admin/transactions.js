import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
// Email notifications disabled
import { logActivity } from '../../lib/logger.js';
import { cleanPhoneNumber } from '../../lib/phone.js';
import { createXhPayPayoutOrder, mapEthiopianBankToCode } from '../../lib/xhpay.js';

const router = Router();
const prisma = new PrismaClient();

// Get all deposits
router.get('/deposits', async (req, res) => {
  try {
    const rawDeposits = await prisma.deposits.findMany({
      include: { user: { select: { email: true, full_name: true, phone: true } } },
      orderBy: { created_at: 'desc' }
    });
    const deposits = rawDeposits.map(d => ({
      ...d,
      user: d.user ? { ...d.user, phone: cleanPhoneNumber(d.user.phone) } : d.user
    }));
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
            amount: Number(deposit.amount),
            balance_before: Number(deposit.user.balance),
            balance_after: newBalance,
            description: `Deposit Approved`
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
    // Email disabled

    res.json(updatedDeposit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update deposit status', details: error.message });
  }
});

// Get all withdrawals
router.get('/withdrawals', async (req, res) => {
  try {
    const rawWithdrawals = await prisma.withdrawals.findMany({
      include: { user: { select: { email: true, full_name: true, phone: true } } },
      orderBy: { created_at: 'desc' }
    });
    const withdrawals = rawWithdrawals.map(w => ({
      ...w,
      user: w.user ? { ...w.user, phone: cleanPhoneNumber(w.user.phone) } : w.user
    }));
    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
});

// Approve/Reject withdrawal (100% Manual Admin Process)
const handleWithdrawalStatusUpdate = async (req, res) => {
  const { status } = req.body;
  const reqStatusUpper = (status || '').toUpperCase();

  const isApproved = ['APPROVED', 'PAID', 'SUCCESSFUL', 'SUCCESS'].includes(reqStatusUpper);
  const isRejected = ['REJECTED', 'FAILED', 'DECLINED'].includes(reqStatusUpper);

  try {
    const withdrawal = await prisma.withdrawals.findUnique({ where: { id: req.params.id }, include: { user: true } });
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });

    if (withdrawal.status !== 'PENDING' && withdrawal.status !== 'pending') {
      return res.status(400).json({ error: `Withdrawal is already ${withdrawal.status}` });
    }

    let updatedWithdrawal;

    if (isApproved) {
      // Check user withdrawable_balance
      const user = await prisma.users.findUnique({ where: { id: withdrawal.user_id } });
      const currentWithdrawable = Number(user?.withdrawable_balance || 0);
      const withdrawAmount = Number(withdrawal.amount);

      if (currentWithdrawable < withdrawAmount) {
        return res.status(400).json({
          error: `Cannot approve withdrawal: user has insufficient withdrawable balance (Current: Br${currentWithdrawable.toFixed(2)}, Required: Br${withdrawAmount.toFixed(2)})`
        });
      }
      const newBalance = currentWithdrawable - withdrawAmount;

      let xhpayPlatformOrder = null;
      const isXhPayConfigured = Boolean(process.env.XHPAY_RSA_PRIVATE_KEY && process.env.XHPAY_MER_NO);
      const isBankWithdrawal = !withdrawal.withdrawal_method?.includes('USDT');

      if (isXhPayConfigured && isBankWithdrawal) {
        try {
          const host = req.get('host');
          const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
          const serverBaseUrl = process.env.BACKEND_URL || `${protocol}://${host}`;
          const notifyUrl = `${serverBaseUrl}/api/xhpay-payout-webhook`;
          const merOrderId = `WDL-${withdrawal.id.slice(0, 8)}-${Date.now()}`;

          const payoutRes = await createXhPayPayoutOrder({
            amount: Number(withdrawal.net_amount || withdrawal.amount),
            merOrder: merOrderId,
            bankName: user?.bank_name || withdrawal.withdrawal_method,
            accName: user?.bank_account_name || user?.full_name,
            accNo: user?.bank_account_number,
            notifyUrl,
            currency: 'ETB'
          });

          xhpayPlatformOrder = payoutRes?.platformOrder || merOrderId;
          console.log('[XHPAY] Payout dispatched successfully:', payoutRes);
        } catch (payoutErr) {
          console.error('[XHPAY] Payout dispatch error:', payoutErr);
          return res.status(500).json({
            error: `Failed to dispatch payout to XHPAY: ${payoutErr.message}`
          });
        }
      }

      await prisma.$transaction([
        prisma.withdrawals.update({
          where: { id: withdrawal.id },
          data: {
            status: 'APPROVED',
            processed_by: req.user?.id || null,
            processed_at: new Date(),
            wallet_address: xhpayPlatformOrder || withdrawal.wallet_address
          }
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
            description: `Withdrawal approved (${withdrawal.withdrawal_method})${xhpayPlatformOrder ? ' [XHPAY: ' + xhpayPlatformOrder + ']' : ''}`
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
    // Email disabled

    return res.json({
      success: true,
      message: `Withdrawal ${isApproved ? 'Approved' : 'Rejected'} successfully.`,
      withdrawal: updatedWithdrawal
    });
  } catch (error) {
    console.error('Failed to update withdrawal status:', error);
    res.status(500).json({ error: 'Failed to update withdrawal status', details: error.message });
  }
};

router.put('/withdrawals/:id/status', handleWithdrawalStatusUpdate);
router.patch('/withdrawals/:id/status', handleWithdrawalStatusUpdate);
router.put('/withdrawals/:id', handleWithdrawalStatusUpdate);
router.patch('/withdrawals/:id', handleWithdrawalStatusUpdate);

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


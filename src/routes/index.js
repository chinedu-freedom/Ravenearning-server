import { Router } from 'express';
import authRoutes from './auth.js';
import userRoutes from './user.js';
import adminRoutes from './admin/index.js';
import plansRoutes from './plans.js';
import settingsRoutes from './settings.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/plans', plansRoutes);
router.use('/settings', settingsRoutes);

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Safe empty fallbacks for legacy content endpoints
router.get('/sliders', (req, res) => res.json({ success: true, data: [] }));
router.get('/partners', (req, res) => res.json({ success: true, data: [] }));
router.get('/news', (req, res) => res.json({ success: true, data: [] }));
router.get('/live-market', (req, res) => res.json({ success: true, data: [] }));
router.get('/team-members', (req, res) => res.json({ success: true, data: [] }));

// Quick Pay Gateway Webhook Callback Handler (Deposit)
const handleDepositWebhook = async (req, res) => {
  try {
    const payload = req.body || {};
    console.log('QuickPay Webhook Payload Received:', JSON.stringify(payload));

    const data = payload.data || payload;
    const { payOrderId, tradeState, status, amount, payAmount } = data;

    const isSuccess = (tradeState === 'SUCCESS' || status === 'success' || tradeState === 'success');

    if (isSuccess && payOrderId) {
      const deposit = await prisma.deposits.findFirst({
        where: {
          OR: [
            { track_id: payOrderId },
            { id: payOrderId.replace('DEP-', '').split('-')[0] }
          ]
        },
        include: { user: true }
      });

      if (deposit && deposit.status !== 'approved') {
        const approvedAmount = Number(payAmount || amount || deposit.amount);

        await prisma.$transaction(async (tx) => {
          await tx.deposits.update({
            where: { id: deposit.id },
            data: {
              status: 'approved',
              approved_at: new Date()
            }
          });

          const userBefore = await tx.users.findUnique({ where: { id: deposit.user_id } });
          const balanceBefore = Number(userBefore.balance);
          const balanceAfter = balanceBefore + approvedAmount;

          await tx.users.update({
            where: { id: deposit.user_id },
            data: { balance: balanceAfter }
          });

          await tx.transactions.create({
            data: {
              user_id: deposit.user_id,
              type: 'DEPOSIT',
              amount: approvedAmount,
              balance_before: balanceBefore,
              balance_after: balanceAfter,
              description: 'Deposit'
            }
          });
        });

        console.log(`QuickPay Deposit ${deposit.id} auto-approved for ${deposit.user_id}`);
      }
    }

    return res.status(200).send('OK');
  } catch (err) {
    console.error('QuickPay Webhook Error:', err);
    return res.status(200).send('OK');
  }
};

// Quick Pay Payout Callback Webhook
const handlePayoutWebhook = async (req, res) => {
  try {
    const payload = req.body || {};
    console.log('Received Quick Pay Payout Webhook payload:', payload);

    const payOrderId = payload.payOrderId || payload.orderId || payload.mchOrderNo || payload.drawOrderId || payload.out_trade_no;
    const tradeState = payload.tradeState || payload.status || payload.state;

    if (payOrderId && (tradeState === 'SUCCESS' || tradeState === '2' || tradeState === 'SUCCESSFUL' || tradeState === 'success')) {
      const withdrawalIdPrefix = payOrderId.replace('WD-', '').split('-')[0];
      const withdrawal = await prisma.withdrawals.findFirst({
        where: {
          OR: [
            { id: { startsWith: withdrawalIdPrefix } },
            { wallet_address: payOrderId }
          ]
        }
      });

      if (withdrawal && withdrawal.status !== 'APPROVED' && withdrawal.status !== 'COMPLETED') {
        await prisma.withdrawals.update({
          where: { id: withdrawal.id },
          data: { status: 'APPROVED', processed_at: new Date() }
        });
        console.log(`QuickPay Payout ${withdrawal.id} successfully completed via webhook.`);
      }
    }

    return res.status(200).send('OK');
  } catch (err) {
    console.error('QuickPay Payout Webhook Error:', err);
    return res.status(200).send('OK');
  }
};

// Bind Webhook URLs and Aliases
router.post('/quickpay-webhook', handleDepositWebhook);
router.post('/quickpay-payout-webhook', handlePayoutWebhook);
router.all('/order/cashnotify/*', handleDepositWebhook);
router.all('/pay/notify', handleDepositWebhook);
router.all('/pay/payout-notify', handlePayoutWebhook);

export default router;

import { Router } from 'express';
import authRoutes from './auth.js';
import userRoutes from './user.js';
import adminRoutes from './admin/index.js';
import plansRoutes from './plans.js';
import settingsRoutes from './settings.js';
import { withdrawalsRouter, depositsRouter } from './adminCompat.js';
import { buildQuickPaySign } from '../lib/quickpay.js';
import { verifyXhPayCallback, buildXhPaySign } from '../lib/xhpay.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/plans', plansRoutes);
router.use('/settings', settingsRoutes);
router.use('/withdrawals', withdrawalsRouter);
router.use('/deposits', depositsRouter);

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

    const settings = await prisma.settings.findFirst();
    const merchantKey = process.env.QUICKPAY_KEY || settings?.quickpay_key;

    const data = payload.data || payload;
    const incomingSign = data.sign || payload.sign;

    // Verify webhook signature if merchant key is configured
    if (merchantKey) {
      if (!incomingSign) {
        console.warn('QuickPay Webhook rejected: missing signature');
        return res.status(400).send('MISSING_SIGN');
      }

      const calculatedSign = buildQuickPaySign(data, merchantKey);
      if (incomingSign.toUpperCase() !== calculatedSign.toUpperCase()) {
        console.warn('QuickPay Webhook rejected: signature mismatch');
        return res.status(400).send('INVALID_SIGN');
      }
    }

    const mchOrderNo = data.mchOrderNo || data.payOrderId || data.out_trade_no || data.orderId || payload.mchOrderNo || payload.payOrderId || payload.out_trade_no;
    const tradeState = data.tradeState || data.status || payload.tradeState || payload.status;
    const rawAmount = data.payAmount || data.amount || payload.payAmount || payload.amount;

    const isSuccess = (
      tradeState === 'SUCCESS' ||
      tradeState === 'success' ||
      tradeState === '2' ||
      tradeState === 2 ||
      tradeState === 'SUCCESSFUL'
    );

    if (isSuccess && mchOrderNo) {
      const rawMchStr = String(mchOrderNo || '');
      const orderPrefix = rawMchStr.replace('DEP-', '').split('-')[0];

      let deposit = await prisma.deposits.findFirst({
        where: {
          OR: [
            { track_id: rawMchStr },
            { track_id: { contains: orderPrefix } }
          ]
        },
        include: { user: true }
      });

      if (!deposit && orderPrefix.length === 36) {
        deposit = await prisma.deposits.findUnique({
          where: { id: orderPrefix },
          include: { user: true }
        });
      }

      if (deposit && deposit.status !== 'APPROVED' && deposit.status !== 'approved') {
        const approvedAmount = rawAmount ? (Number(rawAmount) > 10000 ? Number(rawAmount) / 100 : Number(rawAmount)) : Number(deposit.amount);

        await prisma.$transaction(async (tx) => {
          await tx.deposits.update({
            where: { id: deposit.id },
            data: {
              status: 'APPROVED',
              approved_at: new Date()
            }
          });

          const userBefore = await tx.users.findUnique({ where: { id: deposit.user_id } });
          const balanceBefore = Number(userBefore.balance || 0);
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
              description: 'QuickPay Automatic Online Deposit'
            }
          });
        });

        console.log(`QuickPay Deposit ${deposit.id} (${deposit.track_id}) auto-approved for R${approvedAmount} (User: ${deposit.user_id})`);
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

// XHPAY Gateway Webhook Callback Handler (Deposit)
const handleXhPayDepositWebhook = async (req, res) => {
  try {
    const payload = req.body || {};
    console.log('[XHPAY] Deposit Webhook Payload Received:', JSON.stringify(payload));

    const hmacKey = process.env.XHPAY_HMAC_KEY;
    if (hmacKey) {
      const isValid = verifyXhPayCallback(payload, hmacKey);
      if (!isValid) {
        console.warn('[XHPAY] Deposit Webhook rejected: signature mismatch');
        return res.status(401).send('INVALID_SIGN');
      }
    }

    const platformOrder = payload.platformOrder || payload.trade_no || payload.platform_order_id;
    const merOrder = payload.merOrder || payload.merchant_order_id || payload.mchOrderNo;
    const orderAmount = payload.orderAmount || payload.amount;
    const status = payload.status || payload.order_status || payload.tradeState;
    const isCompleted = String(status).toLowerCase() === 'completed' || String(status).toLowerCase() === 'success';

    if (isCompleted && (merOrder || platformOrder)) {
      const rawMchStr = String(merOrder || '');
      const orderPrefix = rawMchStr.replace('DEP-', '').split('-')[0];

      let deposit = await prisma.deposits.findFirst({
        where: {
          OR: [
            { track_id: String(platformOrder) },
            { track_id: rawMchStr },
            { track_id: { contains: orderPrefix } }
          ]
        },
        include: { user: true }
      });

      if (!deposit && orderPrefix.length === 36) {
        deposit = await prisma.deposits.findUnique({
          where: { id: orderPrefix },
          include: { user: true }
        });
      }

      if (deposit && deposit.status !== 'APPROVED' && deposit.status !== 'approved') {
        const approvedAmount = orderAmount ? Number(orderAmount) : Number(deposit.amount);

        await prisma.$transaction(async (tx) => {
          await tx.deposits.update({
            where: { id: deposit.id },
            data: {
              status: 'APPROVED',
              approved_at: new Date()
            }
          });

          const userBefore = await tx.users.findUnique({ where: { id: deposit.user_id } });
          const balanceBefore = Number(userBefore.balance || 0);
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
              description: 'XHPAY Automatic Online Deposit'
            }
          });
        });

        console.log(`[XHPAY] Deposit ${deposit.id} (${deposit.track_id}) auto-approved for Br${approvedAmount} (User: ${deposit.user_id})`);
      }
    }

    return res.status(200).send('success');
  } catch (err) {
    console.error('[XHPAY] Deposit Webhook Error:', err);
    return res.status(200).send('success');
  }
};

// XHPAY Payout Callback Webhook (Withdrawal)
const handleXhPayPayoutWebhook = async (req, res) => {
  try {
    const payload = req.body || {};
    console.log('[XHPAY] Payout Webhook Payload Received:', JSON.stringify(payload));

    const hmacKey = process.env.XHPAY_HMAC_KEY;
    if (hmacKey && payload.signature) {
      const isValid = verifyXhPayCallback(payload, hmacKey);
      if (!isValid) {
        console.warn('[XHPAY] Payout Webhook rejected: signature mismatch');
        return res.status(401).send('INVALID_SIGN');
      }
    }

    const platformOrder = payload.platformOrder || payload.trade_no || payload.platform_order_id;
    const merOrder = payload.merOrder || payload.merchant_order_id || payload.mchOrderNo || payload.drawOrderId;
    const status = payload.status || payload.order_status || payload.tradeState;
    const statusLower = String(status || '').toLowerCase();
    const isCompleted = statusLower === 'completed' || statusLower === 'success';
    const isFailed = statusLower === 'failed' || statusLower === 'cancelled';

    if (merOrder || platformOrder) {
      const rawOrderId = String(merOrder || '');
      const withdrawalIdPrefix = rawOrderId.replace('WDL-', '').split('-')[0];

      const withdrawal = await prisma.withdrawals.findFirst({
        where: {
          OR: [
            { id: { startsWith: withdrawalIdPrefix } },
            { wallet_address: rawOrderId },
            { wallet_address: String(platformOrder) }
          ]
        },
        include: { user: true }
      });

      if (withdrawal) {
        if (isCompleted && withdrawal.status !== 'APPROVED' && withdrawal.status !== 'COMPLETED') {
          await prisma.withdrawals.update({
            where: { id: withdrawal.id },
            data: { status: 'APPROVED', processed_at: new Date() }
          });
          console.log(`[XHPAY] Payout ${withdrawal.id} successfully completed via webhook.`);
        } else if (isFailed && withdrawal.status === 'PENDING') {
          // Payout failed at gateway: refund user balance and mark rejected
          const refundAmount = Number(withdrawal.amount);
          const currentBal = Number(withdrawal.user.withdrawable_balance || 0);
          const newBal = currentBal + refundAmount;

          await prisma.$transaction([
            prisma.withdrawals.update({
              where: { id: withdrawal.id },
              data: { status: 'REJECTED', processed_at: new Date() }
            }),
            prisma.users.update({
              where: { id: withdrawal.user_id },
              data: { withdrawable_balance: newBal }
            }),
            prisma.transactions.create({
              data: {
                user_id: withdrawal.user_id,
                type: 'REFUND',
                amount: refundAmount,
                balance_before: currentBal,
                balance_after: newBal,
                reference_id: withdrawal.id,
                description: 'XHPAY Payout Failed — Balance Refunded'
              }
            })
          ]);
          console.log(`[XHPAY] Payout ${withdrawal.id} failed. Refunded Br${refundAmount} to user ${withdrawal.user_id}`);
        }
      }
    }

    return res.status(200).send('success');
  } catch (err) {
    console.error('[XHPAY] Payout Webhook Error:', err);
    return res.status(200).send('success');
  }
};

// Bind Webhook URLs and Aliases
router.post('/xhpay-webhook', handleXhPayDepositWebhook);
router.post('/xhpay-payout-webhook', handleXhPayPayoutWebhook);
router.post('/quickpay-webhook', handleDepositWebhook);
router.post('/quickpay-payout-webhook', handlePayoutWebhook);
router.all('/order/cashnotify/*', handleDepositWebhook);
router.all('/pay/notify', handleDepositWebhook);
router.all('/pay/payout-notify', handlePayoutWebhook);

export default router;

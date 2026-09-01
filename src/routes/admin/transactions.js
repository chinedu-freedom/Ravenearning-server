import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendDepositNotificationEmail, sendWithdrawalNotificationEmail } from '../../lib/mailer.js';
import { logActivity } from '../../lib/logger.js';
import { buildQuickPaySign, buildQuickPayDrawSign, getQuickPayFormattedTime } from '../../lib/quickpay.js';
import { cleanPhoneNumber } from '../../lib/phone.js';

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
    try {
      await sendDepositNotificationEmail({
        email: deposit.user.email,
        name: deposit.user.full_name || deposit.user.phone || 'User',
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

// Approve/Reject withdrawal
const handleWithdrawalStatusUpdate = async (req, res) => {
  const { status } = req.body;
  const reqStatusUpper = (status || '').toUpperCase();

  const isApproved = ['APPROVED', 'PAID', 'SUCCESSFUL', 'SUCCESS'].includes(reqStatusUpper);
  const isRejected = ['REJECTED', 'FAILED', 'DECLINED'].includes(reqStatusUpper);

  try {
    const withdrawal = await prisma.withdrawals.findUnique({ where: { id: req.params.id }, include: { user: true } });
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });

    let updatedWithdrawal;

    if (isRejected && (withdrawal.status === 'PENDING' || withdrawal.status === 'pending')) {
      // Refund the user's withdrawable balance
      const newWithdrawable = Number(withdrawal.user.withdrawable_balance || 0) + Number(withdrawal.amount);
      
      const result = await prisma.$transaction([
        prisma.withdrawals.update({
          where: { id: withdrawal.id },
          data: { status: 'REJECTED', processed_by: req.user?.id || null, processed_at: new Date() }
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
      const finalStatus = isApproved ? 'APPROVED' : status;
      updatedWithdrawal = await prisma.withdrawals.update({
        where: { id: withdrawal.id },
        data: { status: finalStatus, processed_by: req.user?.id || null, processed_at: new Date() }
      });

      // Trigger Quick Pay automated payout transfer if approved
      if (isApproved) {
        try {
          const settings = await prisma.settings.findFirst();
          const merchantId = (process.env.QUICKPAY_MERCHANT && process.env.QUICKPAY_MERCHANT !== 'customerTest01')
            ? process.env.QUICKPAY_MERCHANT
            : (settings?.quickpay_merchant && settings.quickpay_merchant !== 'customerTest01')
              ? settings.quickpay_merchant
              : '29fa680428895a245ce880b907047bfe';

          const secretKey = (process.env.QUICKPAY_KEY && process.env.QUICKPAY_KEY !== '147258')
            ? process.env.QUICKPAY_KEY
            : (settings?.quickpay_key && settings.quickpay_key !== '147258')
              ? settings.quickpay_key
              : 'f065020799e18163c90a18b9b2cea99b';

          const gatewayUrl = process.env.QUICKPAY_URL || settings?.quickpay_url || 'https://safricaapi.quickn.vip';

          if (settings?.quickpay_enabled && merchantId && secretKey) {
            const feePercent = Number(settings?.withdrawal_charge || 15);
            const rawAmt = Number(withdrawal.amount);
            const netAmt = (rawAmt * (1 - feePercent / 100)).toFixed(2);
            const payOrderId = `WD-${withdrawal.id.slice(0, 8)}-${Date.now()}`;
            const host = req.get('host');
            const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
            const serverBaseUrl = process.env.BACKEND_URL || settings?.backend_url || `${protocol}://${host}`;
            const notifyUrl = `${serverBaseUrl}/api/quickpay-payout-webhook`;

            const bankName = (withdrawal.user?.bank_name && String(withdrawal.user.bank_name).trim()) ||
                             (withdrawal.withdrawal_method && String(withdrawal.withdrawal_method).trim()) ||
                             'Capitec Bank';

            const rawAccountNo = (withdrawal.wallet_address && String(withdrawal.wallet_address).trim()) ||
                                 (withdrawal.user?.bank_account_number && String(withdrawal.user.bank_account_number).trim()) ||
                                 (withdrawal.user?.phone && String(withdrawal.user.phone).trim()) ||
                                 '8158051119';

            const digitsOnly = rawAccountNo.replace(/\D/g, '');
            const accountNo = digitsOnly.length > 11 ? digitsOnly.slice(-10) : (digitsOnly || '8158051119');

            const accountName = (withdrawal.user?.bank_account_name && String(withdrawal.user.bank_account_name).trim()) ||
                                (withdrawal.user?.full_name && String(withdrawal.user.full_name).trim()) ||
                                (withdrawal.user?.phone && String(withdrawal.user.phone).trim()) ||
                                'Account Holder';

            const payoutChannel = settings?.quickpay_payout_channel || settings?.quickpay_channel || '8001';
            const drawPayload = {
              drawMemberId: merchantId,
              drawOrderId: payOrderId,
              drawAmount: netAmt,
              drawPayNow: "1",
              payChannelCode: payoutChannel,
              drawChannelCode: payoutChannel,
              drawBankName: bankName,
              drawCardNumber: accountNo,
              drawAccountName: accountName,
              drawNotifyUrl: notifyUrl
            };

            const signUpper = buildQuickPayDrawSign(drawPayload, secretKey);
            const signLower = signUpper.toLowerCase();

            let payoutSuccess = false;
            let lastQJson = null;
            const cleanGatewayUrl = gatewayUrl.replace(/\/+$/, '');
            const fullDrawUrl = `${cleanGatewayUrl}/api/pay/createDraw`;

            for (const currentSign of [signUpper, signLower]) {
              const payloadWithSign = {
                ...drawPayload,
                sign: currentSign
              };

              try {
                const qRes = await fetch(fullDrawUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payloadWithSign)
                });
                const qJson = await qRes.json();
                console.log(`Quick Pay /api/pay/createDraw Official Response:`, qJson);
                lastQJson = qJson;

                const codeStr = String(qJson?.code ?? '');
                const statusStr = String(qJson?.status ?? '');

                if (
                  qJson &&
                  (codeStr === '200' ||
                    codeStr === '0' ||
                    codeStr === '100' ||
                    codeStr === '1' ||
                    statusStr === '200' ||
                    statusStr === 'SUCCESS' ||
                    qJson.success === true)
                ) {
                  console.log(`Quick Pay Payout SUCCESS via /api/pay/createDraw!`, qJson);
                  payoutSuccess = true;
                  break;
                }
              } catch (e) {
                console.error(`/api/pay/createDraw error:`, e.message);
              }
            }

            if (!payoutSuccess) {
              const msg = lastQJson?.msg || lastQJson?.message || 'Gateway payout failed';
              let friendlyMsg = `Quick Pay Response: ${msg}`;

              if (msg.includes('余额') || msg.toLowerCase().includes('balance')) {
                friendlyMsg = 'Insufficient merchant payout balance on Quick Pay!';
              } else if (msg.includes('代付申请提交失败') || msg.includes('提交失败')) {
                friendlyMsg = `Quick Pay Payout Failed: ${msg}. Please check: 1) Merchant Payout Balance (代付余额) is funded on QuickPay, 2) Withdrawal amount is >= minimum (e.g. R50+), 3) Bank account details are valid.`;
              } else if (msg.includes('认证失败') || msg.includes('401') || lastQJson?.code === 401) {
                friendlyMsg = `Quick Pay Auth Error (401): ${msg} - Check Payout permissions for Merchant ${merchantId}`;
              }

              // Rollback status to PENDING so admin can retry after fixing gateway settings
              await prisma.withdrawals.update({
                where: { id: withdrawal.id },
                data: { status: 'PENDING' }
              });

              return res.status(400).json({
                success: false,
                error: friendlyMsg,
                message: friendlyMsg
              });
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


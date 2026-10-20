import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { cleanPhoneNumber } from '../lib/phone.js';
import { logActivity } from '../lib/logger.js';

const router = Router();
const prisma = new PrismaClient();

// Helper for pagination
const getPagination = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    totalItems: total,
    totalPages,
    currentPage: page,
    pageSize: limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null
  };
};

/* =========================================================
   1. /api/withdrawals (Used by Admin WithdrawalTable)
========================================================= */
const withdrawalsRouter = Router();
withdrawalsRouter.use(authenticate, requireAdmin);

withdrawalsRouter.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;
    const { search, status } = req.query;

    const where = {};
    if (status && status !== 'all') {
      where.status = { equals: status, mode: 'insensitive' };
    }
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { wallet_address: { contains: q, mode: 'insensitive' } },
        { user: { phone: { contains: q, mode: 'insensitive' } } },
        { user: { full_name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, records] = await Promise.all([
      prisma.withdrawals.count({ where }),
      prisma.withdrawals.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          user: { select: { id: true, email: true, full_name: true, phone: true } }
        }
      })
    ]);

    const mappedRecords = records.map(w => ({
      ...w,
      _id: w.id,
      user: w.user ? { ...w.user, phone: cleanPhoneNumber(w.user.phone) } : null
    }));

    res.json({
      success: true,
      data: {
        records: mappedRecords,
        pagination: getPagination(total, page, limit)
      }
    });
  } catch (error) {
    console.error('Fetch withdrawals error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch withdrawals' });
  }
});

withdrawalsRouter.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const reqStatusUpper = (status || '').toUpperCase();
    const isApproved = ['APPROVED', 'PAID', 'SUCCESSFUL', 'SUCCESS'].includes(reqStatusUpper);
    const isRejected = ['REJECTED', 'FAILED', 'DECLINED'].includes(reqStatusUpper);

    const withdrawal = await prisma.withdrawals.findUnique({
      where: { id: req.params.id },
      include: { user: true }
    });
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });

    if (withdrawal.status !== 'PENDING' && withdrawal.status !== 'pending') {
      return res.status(400).json({ error: `Withdrawal is already ${withdrawal.status}` });
    }

    let updatedWithdrawal;

    if (isApproved) {
      const user = await prisma.users.findUnique({ where: { id: withdrawal.user_id } });
      const currentWithdrawable = Number(user?.withdrawable_balance || 0);
      const withdrawAmount = Number(withdrawal.amount);

      if (currentWithdrawable < withdrawAmount) {
        return res.status(400).json({
          error: `Cannot approve withdrawal: user has insufficient withdrawable balance (Current: R${currentWithdrawable.toFixed(2)}, Required: R${withdrawAmount.toFixed(2)})`
        });
      }
      const newBalance = currentWithdrawable - withdrawAmount;

      await prisma.$transaction([
        prisma.withdrawals.update({
          where: { id: withdrawal.id },
          data: { status: 'APPROVED', processed_by: req.user.id, processed_at: new Date() }
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
            description: `Withdrawal Approved (${withdrawal.withdrawal_method})`,
            reference_id: withdrawal.id
          }
        })
      ]);

      updatedWithdrawal = await prisma.withdrawals.findUnique({ where: { id: withdrawal.id } });
      await logActivity(withdrawal.user_id, 'withdrawal completed', req, { amount: withdrawal.amount });
    } else if (isRejected) {
      updatedWithdrawal = await prisma.withdrawals.update({
        where: { id: withdrawal.id },
        data: { status: 'REJECTED', processed_by: req.user.id, processed_at: new Date() }
      });
      await logActivity(withdrawal.user_id, 'withdrawal rejected', req, { amount: withdrawal.amount });
    } else {
      return res.status(400).json({ error: 'Invalid status' });
    }

    res.json({ success: true, data: { ...updatedWithdrawal, _id: updatedWithdrawal.id } });
  } catch (error) {
    console.error('Update withdrawal error:', error);
    res.status(500).json({ error: 'Failed to update withdrawal status', details: error.message });
  }
});

withdrawalsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.withdrawals.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') return res.json({ success: true, message: 'Deleted successfully' });
    res.status(500).json({ error: 'Failed to delete withdrawal' });
  }
});

/* =========================================================
   2. /api/deposits (Used by Admin DepositTable)
========================================================= */
const depositsRouter = Router();
depositsRouter.use(authenticate, requireAdmin);

depositsRouter.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;
    const { search, status } = req.query;

    const where = {};
    if (status && status !== 'all') {
      where.status = { equals: status, mode: 'insensitive' };
    }
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { track_id: { contains: q, mode: 'insensitive' } },
        { user: { phone: { contains: q, mode: 'insensitive' } } },
        { user: { full_name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, records] = await Promise.all([
      prisma.deposits.count({ where }),
      prisma.deposits.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          user: { select: { id: true, email: true, full_name: true, phone: true } }
        }
      })
    ]);

    const mappedRecords = records.map(d => ({
      ...d,
      _id: d.id,
      user: d.user ? { ...d.user, phone: cleanPhoneNumber(d.user.phone) } : null
    }));

    res.json({
      success: true,
      data: {
        records: mappedRecords,
        pagination: getPagination(total, page, limit)
      }
    });
  } catch (error) {
    console.error('Fetch deposits error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch deposits' });
  }
});

depositsRouter.patch('/:id', async (req, res) => {
  const { status } = req.body;
  try {
    const deposit = await prisma.deposits.findUnique({
      where: { id: req.params.id },
      include: { user: true }
    });
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
            description: `Deposit Approved`,
            reference_id: deposit.id
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
      await logActivity(deposit.user_id, 'deposit completed', req, { amount: deposit.amount });
    } else if (status === 'REJECTED') {
      updatedDeposit = await prisma.deposits.update({
        where: { id: deposit.id },
        data: { status: 'REJECTED', approved_by: req.user.id, approved_at: new Date() }
      });
    } else {
      return res.status(400).json({ error: 'Invalid status' });
    }

    res.json({ success: true, data: { ...updatedDeposit, _id: updatedDeposit.id } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update deposit status', details: error.message });
  }
});

depositsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.deposits.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') return res.json({ success: true, message: 'Deleted successfully' });
    res.status(500).json({ error: 'Failed to delete deposit' });
  }
});

/* =========================================================
   3. /api/admin/user-investments (Used by InvestmentTable)
========================================================= */
const userInvestmentsRouter = Router();
userInvestmentsRouter.use(authenticate, requireAdmin);

userInvestmentsRouter.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;
    const { search } = req.query;

    const where = {};
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { plan: { name: { contains: q, mode: 'insensitive' } } },
        { user: { phone: { contains: q, mode: 'insensitive' } } },
        { user: { full_name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, records] = await Promise.all([
      prisma.investments.count({ where }),
      prisma.investments.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          plan: true,
          user: { select: { id: true, email: true, full_name: true, phone: true } }
        }
      })
    ]);

    const mappedRecords = records.map(inv => ({
      ...inv,
      _id: inv.id,
      user: inv.user ? { ...inv.user, phone: cleanPhoneNumber(inv.user.phone) } : null
    }));

    res.json({
      success: true,
      data: {
        records: mappedRecords,
        pagination: getPagination(total, page, limit)
      }
    });
  } catch (error) {
    console.error('Fetch user-investments error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user investments' });
  }
});

userInvestmentsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.investments.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') return res.json({ success: true, message: 'Deleted successfully' });
    res.status(500).json({ error: 'Failed to delete investment' });
  }
});

export { withdrawalsRouter, depositsRouter, userInvestmentsRouter };

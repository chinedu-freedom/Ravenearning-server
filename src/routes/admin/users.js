import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { logActivity } from '../../lib/logger.js';
import { getSecurityPassword } from '../../lib/security.js';

import { cleanPhoneNumber } from '../../lib/phone.js';

const router = Router();
const prisma = new PrismaClient();

// Get all users
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let where = {};
    if (search && search.trim()) {
      const q = search.trim();
      where = {
        OR: [
          { phone: { contains: q, mode: 'insensitive' } },
          { username: { contains: q, mode: 'insensitive' } },
          { full_name: { contains: q, mode: 'insensitive' } },
        ]
      };
    }
    const rawUsers = await prisma.users.findMany({
      where,
      orderBy: { created_at: 'desc' }
    });

    const users = rawUsers.map(u => ({
      ...u,
      phone: cleanPhoneNumber(u.phone),
      username: (u.username && (u.username.startsWith('27') || u.username.startsWith('+27'))) ? cleanPhoneNumber(u.username) : u.username
    }));

    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});


// Get user details
router.get('/:id', async (req, res) => {
  try {
    const user = await prisma.users.findUnique({
      where: { id: req.params.id },
      include: {
        transactions: { orderBy: { created_at: 'desc' }, take: 10 },
        investments: true
      }
    });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    user.phone = cleanPhoneNumber(user.phone);
    if (user.username && (user.username.startsWith('27') || user.username.startsWith('+27'))) {
      user.username = cleanPhoneNumber(user.username);
    }

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});


// Update user settings/permissions
router.put('/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    const plainPassword = data.new_password || data.password;
    if (plainPassword && plainPassword.trim()) {
      data.password_hash = await bcrypt.hash(plainPassword.trim(), 10);
    }
    delete data.new_password;
    delete data.password;

    const plainWithdrawalPin = data.new_withdrawal_pin || data.withdrawal_pin || data.new_withdrawal_password || data.withdrawal_password;
    if (plainWithdrawalPin && plainWithdrawalPin.trim()) {
      data.withdrawal_pin = await bcrypt.hash(plainWithdrawalPin.trim(), 10);
    }
    delete data.new_withdrawal_pin;
    delete data.withdrawal_pin;
    delete data.new_withdrawal_password;
    delete data.withdrawal_password;

    const user = await prisma.users.update({
      where: { id: req.params.id },
      data: data
    });

    if (data.is_active !== undefined) {
      const action = data.is_active ? 'user unbanned' : 'user banned';
      await logActivity(user.id, action, req);
    }

    res.json({ success: true, message: 'User updated successfully', data: user });
  } catch (error) {
    console.error('Failed to update user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Manual Credit
router.post('/:id/credit', async (req, res) => {
  const { amount, reason, balance_type, adminPassword } = req.body; // balance_type: 'withdrawable' or 'balance'
  try {
    if (!adminPassword) {
      return res.status(400).json({ error: 'Admin password is required' });
    }

    const adminRecord = await prisma.admins.findUnique({ where: { id: req.user.id } });
    const isSecurityPassValid = adminPassword === getSecurityPassword();
    const isAdminPassValid = adminRecord ? await bcrypt.compare(adminPassword, adminRecord.password_hash) : false;
    if (!isSecurityPassValid && !isAdminPassValid) {
      return res.status(401).json({ error: 'Incorrect admin verification password' });
    }

    const user = await prisma.users.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const currentBalance = balance_type === 'withdrawable' ? user.withdrawable_balance : user.balance;
    const newBalance = Number(currentBalance) + Number(amount);

    const updateData = {};
    if (balance_type === 'withdrawable') updateData.withdrawable_balance = newBalance;
    else updateData.balance = newBalance;

    const updatedUser = await prisma.$transaction([
      prisma.users.update({
        where: { id: user.id },
        data: updateData
      }),
      prisma.transactions.create({
        data: {
          user_id: user.id,
          type: 'ADMIN_CREDIT',
          amount: amount,
          balance_before: currentBalance,
          balance_after: newBalance,
          description: reason || 'Manual credit by admin'
        }
      })
    ]);

    await logActivity(user.id, 'admin credit', req, { amount, reason, balance_type });

    res.json(updatedUser[0]);
  } catch (error) {
    res.status(500).json({ error: 'Credit failed', details: error.message });
  }
});

// Manual Debit
router.post('/:id/debit', async (req, res) => {
  const { amount, reason, balance_type, adminPassword } = req.body; // balance_type: 'withdrawable' or 'balance'
  try {
    if (!adminPassword) {
      return res.status(400).json({ error: 'Admin password is required' });
    }

    const adminRecord = await prisma.admins.findUnique({ where: { id: req.user.id } });
    const isSecurityPassValid = adminPassword === getSecurityPassword();
    const isAdminPassValid = adminRecord ? await bcrypt.compare(adminPassword, adminRecord.password_hash) : false;
    if (!isSecurityPassValid && !isAdminPassValid) {
      return res.status(401).json({ error: 'Incorrect admin verification password' });
    }

    const user = await prisma.users.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const currentBalance = balance_type === 'withdrawable' ? user.withdrawable_balance : user.balance;
    if (Number(currentBalance) < Number(amount)) {
      return res.status(400).json({ error: 'Insufficient balance for debit' });
    }
    const newBalance = Number(currentBalance) - Number(amount);

    const updateData = {};
    if (balance_type === 'withdrawable') updateData.withdrawable_balance = newBalance;
    else updateData.balance = newBalance;

    const updatedUser = await prisma.$transaction([
      prisma.users.update({
        where: { id: user.id },
        data: updateData
      }),
      prisma.transactions.create({
        data: {
          user_id: user.id,
          type: 'ADMIN_DEBIT',
          amount: amount,
          balance_before: currentBalance,
          balance_after: newBalance,
          description: reason || 'Manual debit by admin'
        }
      })
    ]);

    await logActivity(user.id, 'admin debit', req, { amount, reason, balance_type });

    res.json(updatedUser[0]);
  } catch (error) {
    res.status(500).json({ error: 'Debit failed', details: error.message });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user exists to be idempotent
    const userExists = await prisma.users.findUnique({ where: { id: userId } });
    if (!userExists) {
      return res.json({ success: true, message: 'User already deleted' });
    }
    
    // Nullify referrals
    await prisma.users.updateMany({ where: { referred_by: userId }, data: { referred_by: null } });

    // Manual cascade delete
    await prisma.investment_profits.deleteMany({ where: { user_id: userId } });
    await prisma.transactions.deleteMany({ where: { user_id: userId } });
    await prisma.investments.deleteMany({ where: { user_id: userId } });
    await prisma.deposits.deleteMany({ where: { user_id: userId } });
    await prisma.withdrawals.deleteMany({ where: { user_id: userId } });
    await prisma.spin_logs.deleteMany({ where: { user_id: userId } });
    await prisma.user_checkins.deleteMany({ where: { user_id: userId } });
    await prisma.task_claims.deleteMany({ where: { user_id: userId } });
    await prisma.gift_code_claims.deleteMany({ where: { user_id: userId } });
    await prisma.referral_commissions.deleteMany({ where: { OR: [{ user_id: userId }, { from_user_id: userId }] } });
    await prisma.activity_logs.deleteMany({ where: { user_id: userId } });
    await prisma.email_logs.deleteMany({ where: { user_id: userId } });
    await prisma.user_spins.deleteMany({ where: { user_id: userId } });
    await prisma.password_resets.deleteMany({ where: { user_id: userId } });
    
    // Finally, delete the user
    await prisma.users.delete({
      where: { id: userId }
    });
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025' || error.message?.includes('Record to delete does not exist') || error.message?.includes('not found')) {
      return res.json({ success: true, message: 'User deleted successfully' });
    }
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});



export default router;


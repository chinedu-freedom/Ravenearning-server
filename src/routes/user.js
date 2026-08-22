import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import bcrypt from 'bcrypt';
import {
  sendVerificationEmail,
  sendDepositNotificationEmail,
  sendWithdrawalNotificationEmail,
  sendPasswordChangeConfirmationEmail
} from '../lib/mailer.js';
import { logActivity } from '../lib/logger.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        full_name: true,
        username: true,
        balance: true,
        is_active: true,
        created_at: true
      }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});
// Get current user profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.users.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const depositsAggr = await prisma.deposits.aggregate({
      _sum: { amount: true },
      where: { user_id: req.user.id, status: 'APPROVED' }
    });

    const withdrawalsAggr = await prisma.withdrawals.aggregate({
      _sum: { amount: true },
      where: { user_id: req.user.id, status: 'APPROVED' }
    });

    const userTransactions = await prisma.transactions.findMany({
      where: { user_id: req.user.id }
    });

    let totalIncome = 0;
    for (const t of userTransactions) {
      if (t.type !== 'DEPOSIT' && t.type !== 'ADMIN_DEBIT') {
        if (parseFloat(t.balance_after) > parseFloat(t.balance_before)) {
          totalIncome += parseFloat(t.amount);
        }
      }
    }

    const teamMembersCount = await prisma.users.count({
      where: { referred_by: req.user.id }
    });

    let referralCode = user.referral_code ? String(user.referral_code) : "";
    if (!referralCode || referralCode.startsWith('SA') || referralCode.length !== 6 || /^\d+$/.test(referralCode)) {
      let isUnique = false;
      let attempts = 0;
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      while (!isUnique && attempts < 20) {
        attempts++;
        referralCode = '';
        for (let i = 0; i < 6; i++) {
          referralCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const existing = await prisma.users.findFirst({
          where: { referral_code: referralCode }
        });
        if (!existing) {
          isUnique = true;
        }
      }
      try {
        await prisma.users.update({
          where: { id: user.id },
          data: { referral_code: referralCode }
        });
      } catch (err) {
        console.error("Failed to update referral code:", err);
        referralCode = user.phone || user.username || user.id;
      }
    }

    const bankDetails = user.bank_account_number ? {
      account_name: user.bank_account_name,
      bank_name: user.bank_name,
      account_number: user.bank_account_number
    } : null;

    res.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        full_name: user.full_name,
        username: user.username,
        profile_image: user.profile_image,
        balance: user.balance,
        withdrawable_balance: user.withdrawable_balance,
        gift_balance: user.gift_balance,
        country: { country_name: 'South Africa', currency_symbol: 'R', currency_code: 'ZAR' },
        language: { language_name: 'English', language_code: 'en' },
        referral_code: referralCode,
        has_withdrawal_pin: !!user.withdrawal_pin,
        bank_details: bankDetails,
        email_verified: user.email_verified,
        created_at: user.created_at,
        statistics: {
          total_deposit: depositsAggr._sum.amount || 0,
          total_withdrawal: withdrawalsAggr._sum.amount || 0,
          total_income: totalIncome,
          team_members: teamMembersCount
        }
      }
    });
  } catch (error) {
    console.error("Error fetching user profile in /users/me:", error);
    res.status(500).json({ success: false, error: 'Failed to fetch user profile' });
  }
});

// Post bank details
router.post('/bank-details', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { account_name, bank_name, account_number } = req.body;

    if (!account_name || !bank_name || !account_number) {
      return res.status(400).json({ success: false, message: 'All bank details are required' });
    }

    await prisma.users.update({
      where: { id: userId },
      data: {
        bank_account_name: account_name,
        bank_name,
        bank_account_number: account_number
      }
    });

    res.json({
      success: true,
      message: 'Bank details linked successfully',
      bank_details: { account_name, bank_name, account_number }
    });
  } catch (error) {
    console.error('Save bank details error:', error);
    res.status(500).json({ success: false, message: 'Failed to link bank details' });
  }
});

// Get user's investments
router.get('/me/investments', authenticate, async (req, res) => {
  try {
    const investments = await prisma.investments.findMany({
      where: { user_id: req.user.id },
      include: {
        plan: true
      },
      orderBy: { created_at: 'desc' }
    });

    const activeInvestments = investments.filter(i => i.status === 'active' || i.status === 'ACTIVE');
    const completedInvestments = investments.filter(i => i.status === 'completed' || i.status === 'COMPLETED');

    let totalInvested = 0;
    let totalMonthlyEst = 0;

    for (const inv of activeInvestments) {
      totalInvested += Number(inv.amount) || 0;
      if (inv.plan && inv.plan.daily_income) {
        // Calculate total expected returns based on the actual plan duration in days
        const duration = Number(inv.plan.duration) || 30;
        totalMonthlyEst += (Number(inv.amount) || 0) * (Number(inv.plan.daily_income) / 100) * duration;
      }
    }

    res.json({
      success: true,
      data: {
        all: investments,
        active: activeInvestments,
        completed: completedInvestments,
        stats: {
          total_invested: totalInvested,
          active_count: activeInvestments.length,
          est_monthly: totalMonthlyEst
        }
      }
    });
  } catch (error) {
    console.error('Fetch user investments error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch investments' });
  }
});

// Update profile image
router.put('/profile-image', authenticate, async (req, res) => {
  try {
    const { profile_image } = req.body;

    if (!profile_image) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }

    await prisma.users.update({
      where: { id: req.user.id },
      data: { profile_image }
    });

    res.json({ success: true, message: 'Profile image updated successfully' });
  } catch (error) {
    console.error('Profile image update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile image' });
  }
});

// Get user transactions
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const rawTransactions = await prisma.transactions.findMany({
      where: { user_id: req.user.id },
      orderBy: { created_at: 'desc' }
    });

    const nonApprovedDeposits = await prisma.deposits.findMany({
      where: { user_id: req.user.id, status: { not: 'approved' } },
      orderBy: { created_at: 'desc' }
    });

    const nonApprovedWithdrawals = await prisma.withdrawals.findMany({
      where: { user_id: req.user.id, status: { notIn: ['approved', 'processed', 'completed', 'success'] } },
      orderBy: { created_at: 'desc' }
    });

    // Fetch user withdrawals to map reference_id to wallet_address for withdrawal transactions
    const userWithdrawals = await prisma.withdrawals.findMany({
      where: { user_id: req.user.id }
    });

    const withdrawalMap = {};
    userWithdrawals.forEach(w => {
      withdrawalMap[w.id] = w.wallet_address;
    });

    const mappedTransactions = rawTransactions.map(t => {
      const isWithdrawal = t.type === 'WITHDRAWAL';
      return {
        ...t,
        status: 'SUCCESS',
        wallet_address: (isWithdrawal && t.reference_id) ? withdrawalMap[t.reference_id] : undefined
      };
    });

    const mappedDeposits = nonApprovedDeposits.map(d => ({
      id: d.id,
      user_id: d.user_id,
      type: 'deposit',
      amount: d.amount,
      balance_before: 0,
      balance_after: d.amount,
      description: `Deposit via ${d.cryptocurrency || 'Crypto'}`,
      status: d.status ? d.status.toUpperCase() : 'PENDING',
      created_at: d.created_at
    }));

    const mappedWithdrawals = nonApprovedWithdrawals.map(w => ({
      id: w.id,
      user_id: w.user_id,
      type: 'withdrawal',
      amount: w.amount,
      balance_before: w.amount,
      balance_after: 0,
      description: `Withdrawal via ${w.withdrawal_method}`,
      status: w.status ? w.status.toUpperCase() : 'PENDING',
      created_at: w.created_at,
      wallet_address: w.wallet_address
    }));

    const allTransactions = [...mappedTransactions, ...mappedDeposits, ...mappedWithdrawals];
    allTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json({ success: true, transactions: allTransactions });
  } catch (error) {
    console.error('Transactions fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
});

// Update user language
router.put('/me/language', authenticate, async (req, res) => {
  res.json({ success: true, message: 'Language updated' });
});

// Get User Team Statistics
// Get tasks and user progress
router.get('/tasks', authenticate, async (req, res) => {
  try {
    const tasks = await prisma.tasks.findMany({
      where: { status: true },
      orderBy: { created_at: 'asc' }
    });

    // We only check task claims for today since these are daily tasks
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const userClaims = await prisma.task_claims.findMany({
      where: {
        user_id: req.user.id,
        completed_at: {
          gte: startOfDay
        }
      }
    });

    const todayReferralsCount = await prisma.users.count({
      where: {
        referred_by: req.user.id,
        created_at: {
          gte: startOfDay
        }
      }
    });

    const tasksWithProgress = tasks.map(task => {
      const claim = userClaims.find(c => c.task_id === task.id);
      const isClaimed = !!claim;
      const progress = isClaimed ? task.required_referrals : Math.min(todayReferralsCount, task.required_referrals);

      return {
        ...task,
        progress,
        isClaimed,
        isReady: progress >= task.required_referrals && !isClaimed
      };
    });

    res.json({
      success: true,
      todayReferralsCount,
      tasks: tasksWithProgress
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
  }
});

// Claim a task reward
router.post('/tasks/claim', authenticate, async (req, res) => {
  try {
    const { taskId } = req.body;
    const userId = req.user.id;

    const task = await prisma.tasks.findUnique({ where: { id: taskId } });
    if (!task || !task.status) {
      return res.status(404).json({ success: false, error: 'Task not found or inactive' });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const existingClaim = await prisma.task_claims.findFirst({
      where: {
        task_id: taskId,
        user_id: userId,
        completed_at: {
          gte: startOfDay
        }
      }
    });

    if (existingClaim) {
      return res.status(400).json({ success: false, error: 'Task already claimed today' });
    }

    const todayReferralsCount = await prisma.users.count({
      where: {
        referred_by: userId,
        created_at: {
          gte: startOfDay
        }
      }
    });

    if (todayReferralsCount < task.required_referrals) {
      return res.status(400).json({ success: false, error: 'Task requirements not met' });
    }

    // Process claim in transaction
    await prisma.$transaction(async (tx) => {
      await tx.task_claims.create({
        data: {
          task_id: taskId,
          user_id: userId,
          status: 'COMPLETED'
        }
      });

      // Update user withdrawable balance
      const updatedUser = await tx.users.update({
        where: { id: userId },
        data: { withdrawable_balance: { increment: task.reward_amount } }
      });

      // Record transaction
      await tx.transactions.create({
        data: {
          user_id: userId,
          type: 'TASK_REWARD',
          amount: task.reward_amount,
          balance_before: Number(updatedUser.withdrawable_balance) - Number(task.reward_amount),
          balance_after: updatedUser.withdrawable_balance,
          description: `Reward for completing task: ${task.task_name}`
        }
      });
    });

    res.json({ success: true, message: 'Task claimed successfully' });
  } catch (error) {
    console.error('Claim task error:', error);
    res.status(500).json({ success: false, error: 'Failed to claim task' });
  }
});

// Get Treasure History
router.get('/treasure/history', authenticate, async (req, res) => {
  try {
    const claims = await prisma.gift_code_claims.findMany({
      where: { user_id: req.user.id },
      include: { gift_code: true },
      orderBy: { claimed_at: 'desc' }
    });
    res.json({ success: true, claims });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch treasure history' });
  }
});

// Claim Treasure Gift Code
router.post('/treasure/claim', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Gift code is required' });

    const userId = req.user.id;

    // Find the code
    const giftCode = await prisma.gift_codes.findUnique({
      where: { code }
    });

    if (!giftCode) {
      return res.status(404).json({ success: false, error: 'Invalid gift code' });
    }

    if (!giftCode.status) {
      return res.status(400).json({ success: false, error: 'Gift code is inactive' });
    }

    if (giftCode.expires_at && new Date() > new Date(giftCode.expires_at)) {
      return res.status(400).json({ success: false, error: 'Gift code has expired' });
    }

    if (giftCode.used_count >= giftCode.max_uses) {
      return res.status(400).json({ success: false, error: 'Gift code already used' });
    }

    // Check if already claimed
    const existingClaim = await prisma.gift_code_claims.findFirst({
      where: {
        gift_code_id: giftCode.id,
        user_id: userId
      }
    });

    if (existingClaim) {
      return res.status(400).json({ success: false, error: 'You have already claimed this gift code' });
    }

    // Process claim in transaction
    await prisma.$transaction(async (tx) => {
      // Create claim
      await tx.gift_code_claims.create({
        data: {
          gift_code_id: giftCode.id,
          user_id: userId,
          reward_amount: giftCode.reward_amount
        }
      });

      // Update code usage
      await tx.gift_codes.update({
        where: { id: giftCode.id },
        data: { used_count: { increment: 1 } }
      });

      // Fetch user to get current balances
      const user = await tx.users.findUnique({ where: { id: userId } });

      let balance_before = user.withdrawable_balance;
      let balance_after = Number(user.withdrawable_balance) + Number(giftCode.reward_amount);

      await tx.users.update({
        where: { id: userId },
        data: { withdrawable_balance: balance_after }
      });

      // Record transaction
      await tx.transactions.create({
        data: {
          user_id: userId,
          type: 'TREASURE_REWARD',
          amount: giftCode.reward_amount,
          balance_before: balance_before,
          balance_after: balance_after,
          description: `Treasure Reward from code: ${giftCode.code_name || giftCode.code}`
        }
      });
    });

    await logActivity(userId, 'bonus claimed', req, { code: giftCode.code, amount: giftCode.reward_amount });

    res.json({ success: true, message: 'Gift code claimed successfully!', reward_amount: giftCode.reward_amount });
  } catch (error) {
    console.error('Claim gift code error:', error);
    res.status(500).json({ success: false, error: 'Failed to claim gift code' });
  }
});

router.get('/team', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get platform settings for commissions
    const settings = await prisma.settings.findFirst();
    const l1Comm = parseFloat(settings?.level1_commission || 0);
    const l2Comm = parseFloat(settings?.level2_commission || 0);
    const l3Comm = parseFloat(settings?.level3_commission || 0);

    // Get Level 1 Users
    const level1Users = await prisma.users.findMany({
      where: { referred_by: userId },
      include: { investments: true, deposits: true }
    });
    const l1Ids = level1Users.map(u => u.id);

    // Get Level 2 Users
    let level2Users = [];
    if (l1Ids.length > 0) {
      level2Users = await prisma.users.findMany({
        where: { referred_by: { in: l1Ids } },
        include: { investments: true, deposits: true }
      });
    }
    const l2Ids = level2Users.map(u => u.id);

    // Get Level 3 Users
    let level3Users = [];
    if (l2Ids.length > 0) {
      level3Users = await prisma.users.findMany({
        where: { referred_by: { in: l2Ids } },
        include: { investments: true, deposits: true }
      });
    }

    // Count Valid members (those with at least one investment)
    const l1Valid = level1Users.filter(u => u.investments.length > 0).length;
    const l2Valid = level2Users.filter(u => u.investments.length > 0).length;
    const l3Valid = level3Users.filter(u => u.investments.length > 0).length;

    // Calculate Total Deposits per level
    const calcDeposits = (users) => users.reduce((acc, user) => {
      const userDeposits = user.deposits?.filter(d => d.status === 'approved').reduce((sum, d) => sum + parseFloat(d.amount), 0) || 0;
      return acc + userDeposits;
    }, 0);

    const l1Deposits = calcDeposits(level1Users);
    const l2Deposits = calcDeposits(level2Users);
    const l3Deposits = calcDeposits(level3Users);

    // Get Referral Commissions
    const commissions = await prisma.referral_commissions.findMany({
      where: { user_id: userId }
    });

    // Compute Earnings per Level
    const l1Earnings = commissions.filter(c => c.level === 1).reduce((acc, c) => acc + parseFloat(c.amount), 0);
    const l2Earnings = commissions.filter(c => c.level === 2).reduce((acc, c) => acc + parseFloat(c.amount), 0);
    const l3Earnings = commissions.filter(c => c.level === 3).reduce((acc, c) => acc + parseFloat(c.amount), 0);

    // Get Today's metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allTeamMembers = [...level1Users, ...level2Users, ...level3Users];
    const newMembersToday = allTeamMembers.filter(u => new Date(u.created_at) >= today).length;

    const newEarningsToday = commissions
      .filter(c => new Date(c.created_at) >= today)
      .reduce((acc, c) => acc + parseFloat(c.amount), 0);

    res.json({
      success: true,
      data: {
        overview: {
          new_members_today: newMembersToday,
          new_earnings_today: newEarningsToday,
          total_team: allTeamMembers.length
        },
        levels: [
          {
            level: 1,
            total_members: level1Users.length,
            valid_members: l1Valid,
            commission_rate: l1Comm,
            total_earnings: l1Earnings,
            total_deposits: l1Deposits
          },
          {
            level: 2,
            total_members: level2Users.length,
            valid_members: l2Valid,
            commission_rate: l2Comm,
            total_earnings: l2Earnings,
            total_deposits: l2Deposits
          },
          {
            level: 3,
            total_members: level3Users.length,
            valid_members: l3Valid,
            commission_rate: l3Comm,
            total_earnings: l3Earnings,
            total_deposits: l3Deposits
          }
        ]
      }
    });

  } catch (error) {
    console.error('Failed to fetch team stats:', error);
    res.status(500).json({ error: 'Failed to fetch team stats' });
  }
});

// Get User Team List By Level
router.get('/team/list', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const level = parseInt(req.query.level) || 1;

    let targetUsers = [];

    // Get Level 1
    const level1Users = await prisma.users.findMany({
      where: { referred_by: userId },
      include: { investments: true, deposits: true }
    });

    if (level === 1) {
      targetUsers = level1Users;
    } else {
      const l1Ids = level1Users.map(u => u.id);

      if (level === 2 && l1Ids.length > 0) {
        targetUsers = await prisma.users.findMany({
          where: { referred_by: { in: l1Ids } },
          include: { investments: true, deposits: true }
        });
      } else if (level === 3 && l1Ids.length > 0) {
        const level2Users = await prisma.users.findMany({
          where: { referred_by: { in: l1Ids } }
        });
        const l2Ids = level2Users.map(u => u.id);
        if (l2Ids.length > 0) {
          targetUsers = await prisma.users.findMany({
            where: { referred_by: { in: l2Ids } },
            include: { investments: true, deposits: true }
          });
        }
      }
    }

    // Map the users to include stats
    const formattedList = targetUsers.map(u => {
      const totalInvested = u.investments ? u.investments.reduce((acc, inv) => acc + parseFloat(inv.amount), 0) : 0;
      const totalDeposited = u.deposits ? u.deposits.filter(d => d.status === 'approved').reduce((acc, d) => acc + parseFloat(d.amount), 0) : 0;
      return {
        id: u.id,
        username: u.username || u.full_name || 'Anonymous',
        joined_at: u.created_at,
        status: u.is_active ? 'Active' : 'Inactive',
        balance: parseFloat(u.balance || 0),
        invested_amount: totalInvested,
        deposited_amount: totalDeposited
      };
    });

    res.json({
      success: true,
      data: formattedList
    });

  } catch (error) {
    console.error('Failed to fetch team list:', error);
    res.status(500).json({ error: 'Failed to fetch team list' });
  }
});

// Update Profile
router.put('/me/profile', authenticate, async (req, res) => {
  try {
    const { full_name, username } = req.body;

    if (username) {
      const existing = await prisma.users.findFirst({ where: { username, id: { not: req.user.id } } });
      if (existing) return res.status(400).json({ success: false, error: 'Username is already taken' });
    }

    const updatedUser = await prisma.users.update({
      where: { id: req.user.id },
      data: { full_name, username }
    });

    await logActivity(req.user.id, 'profile updated', req, { updatedFields: { full_name, username } });

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// Update Login Password
router.put('/me/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.users.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Incorrect current password' });

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
    }

    if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'Password must contain both letters and numbers' });
    }

    const isSameAsOld = await bcrypt.compare(newPassword, user.password_hash);
    if (isSameAsOld) {
      return res.status(400).json({ success: false, message: 'New password cannot be the same as your current password' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    await prisma.users.update({
      where: { id: req.user.id },
      data: { password_hash: hash }
    });

    try {
      await sendPasswordChangeConfirmationEmail(req.user.email, req.user.full_name || req.user.username || 'User');
    } catch (err) {
      console.error('Failed to send password change confirmation email:', err);
    }

    await logActivity(req.user.id, 'profile updated', req, { description: 'Updated password' });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ success: false, message: 'Failed to update password' });
  }
});

// Update Withdrawal Pin
router.put('/me/payment', authenticate, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ success: false, message: 'Password must be at least 4 characters' });
    }

    const salt = await bcrypt.genSalt(10);
    const pinHash = await bcrypt.hash(newPassword, salt);

    await prisma.$executeRaw`UPDATE "users" SET "withdrawal_pin" = ${pinHash} WHERE "id" = ${req.user.id}::uuid`;

    res.json({ success: true, message: 'Withdrawal password updated successfully' });
  } catch (error) {
    console.error('Set withdrawal pin error:', error);
    res.status(500).json({ success: false, message: 'Failed to update withdrawal password' });
  }
});

// Delete user account
router.delete('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.$transaction(async (tx) => {
      // 1. Delete dependent records (transactions, logs, etc.)
      await tx.investment_profits.deleteMany({ where: { user_id: userId } });
      await tx.transactions.deleteMany({ where: { user_id: userId } });
      await tx.investments.deleteMany({ where: { user_id: userId } });
      await tx.deposits.deleteMany({ where: { user_id: userId } });
      await tx.withdrawals.deleteMany({ where: { user_id: userId } });
      await tx.spin_logs.deleteMany({ where: { user_id: userId } });
      await tx.user_checkins.deleteMany({ where: { user_id: userId } });
      await tx.task_claims.deleteMany({ where: { user_id: userId } });
      await tx.gift_code_claims.deleteMany({ where: { user_id: userId } });

      // Delete referral commissions where user is either the earner or the giver
      await tx.referral_commissions.deleteMany({
        where: {
          OR: [
            { user_id: userId },
            { from_user_id: userId }
          ]
        }
      });

      await tx.activity_logs.deleteMany({ where: { user_id: userId } });
      await tx.email_logs.deleteMany({ where: { user_id: userId } });
      await tx.user_spins.deleteMany({ where: { user_id: userId } });
      await tx.password_resets.deleteMany({ where: { user_id: userId } });

      // 2. Remove the referrer constraint for users referred by this user
      await tx.users.updateMany({
        where: { referred_by: userId },
        data: { referred_by: null }
      });

      // 3. Finally delete the user
      await tx.users.delete({ where: { id: userId } });
    });

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.json({ success: true, message: 'Account deleted successfully' });
    }
    console.error('Account deletion error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
});

// Send Verification Email
router.post('/me/send-verification', authenticate, async (req, res) => {
  try {
    const user = await prisma.users.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.email_verified) {
      return res.status(400).json({ success: false, message: 'Email is already verified' });
    }

    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    await prisma.users.update({
      where: { id: req.user.id },
      data: {
        verification_code: code,
        verification_expires: expiresAt
      }
    });

    const emailSent = await sendVerificationEmail({
      email: user.email,
      name: user.full_name,
      code: code
    });

    if (!emailSent.success) {
      return res.status(500).json({ success: false, message: 'Failed to send verification email. Try again later.' });
    }

    res.json({ success: true, message: 'Verification code sent to your email' });
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ success: false, message: 'Failed to process verification request' });
  }
});

// Verify Email Code
router.post('/me/verify-email', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Verification code is required' });
    }

    const user = await prisma.users.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.email_verified) {
      return res.status(400).json({ success: false, message: 'Email is already verified' });
    }

    if (user.verification_code !== code) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    if (!user.verification_expires || new Date() > user.verification_expires) {
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new one.' });
    }

    // Mark as verified and clear code
    await prisma.users.update({
      where: { id: req.user.id },
      data: {
        email_verified: true,
        verification_code: null,
        verification_expires: null
      }
    });

    res.json({ success: true, message: 'Email successfully verified' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify email' });
  }
});

// ==========================================
// SPIN WHEEL ENDPOINTS
// ==========================================

// Get spin wheel configuration and user spin data
router.get('/spin', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch settings and prizes
    const settings = await prisma.spin_settings.findFirst();
    if (!settings || !settings.feature_enabled) {
      return res.status(403).json({ success: false, message: 'Spin wheel is currently disabled' });
    }

    // Ensure "Oops Try Again" exists at position 9
    let tryAgainPrize = await prisma.spin_prizes.findFirst({
      where: { position: 9 }
    });

    if (!tryAgainPrize) {
      tryAgainPrize = await prisma.spin_prizes.findFirst({
        where: { name: { contains: 'Try Again' } }
      });

      if (!tryAgainPrize) {
        tryAgainPrize = await prisma.spin_prizes.create({
          data: {
            position: 9,
            name: "Oops Try AgainðŸ¥²",
            value: 0.00,
            weight: 150,
            probability: 0.15,
            color: "#ef4444",
            icon: "Frown",
            status: true
          }
        });
      } else {
        tryAgainPrize = await prisma.spin_prizes.update({
          where: { id: tryAgainPrize.id },
          data: { position: 9 }
        });
      }
    }

    const activePrizes = await prisma.spin_prizes.findMany({
      where: {
        status: true,
        position: { lte: 8 }
      },
      orderBy: { position: 'asc' },
      take: 8
    });

    const prizes = [];
    for (let i = 0; i < 8; i++) {
      if (activePrizes[i]) {
        prizes.push(activePrizes[i]);
      } else {
        prizes.push({
          id: `placeholder-${i}`,
          name: `R0.00`,
          value: 0.00,
          weight: 100,
          position: i + 1,
          status: true,
          color: i % 2 === 0 ? "#3b82f6" : "#60a5fa",
          icon: "Coins"
        });
      }
    }
    prizes.push(tryAgainPrize);

    // Ensure user_spins record exists
    let userSpins = await prisma.user_spins.findUnique({ where: { user_id: userId } });
    if (!userSpins) {
      userSpins = await prisma.user_spins.create({
        data: {
          user_id: userId,
          free_spins_remaining: 0,
          total_spins_used: 0,
          total_rewards_earned: 0
        }
      });
    }

    // Get recent wins (last 5)
    const recentWins = await prisma.spin_logs.findMany({
      where: { user_id: userId },
      include: { prize: true },
      orderBy: { created_at: 'desc' },
      take: 10
    });

    // We also need the user's available balance to see if they can afford a paid spin
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { balance: true }
    });

    res.json({
      success: true,
      data: {
        settings,
        prizes,
        userSpins,
        recentWins,
        accountBalance: user.balance
      }
    });

  } catch (error) {
    console.error('Fetch spin data error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch spin data' });
  }
});

// Play a spin
router.post('/spin', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch settings and check if enabled
    const settings = await prisma.spin_settings.findFirst();
    if (!settings || !settings.feature_enabled) {
      return res.status(403).json({ success: false, message: 'Spin wheel is currently disabled' });
    }

    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    let userSpins = await prisma.user_spins.findUnique({
      where: { user_id: userId }
    });

    if (!userSpins) {
      userSpins = await prisma.user_spins.create({
        data: { user_id: userId }
      });
    }

    let spinType = 'paid';
    let cost = Number(settings.cost_per_spin);

    // Check if they have free spins
    if (userSpins && userSpins.free_spins_remaining > 0) {
      spinType = 'free';
      cost = 0;
    } else {
      // Check if they can afford paid spin
      if (Number(user.balance) < cost) {
        return res.status(400).json({ success: false, message: 'Insufficient balance for a spin' });
      }
    }

    // Ensure "Oops Try Again" exists at position 9
    let tryAgainPrize = await prisma.spin_prizes.findFirst({
      where: { position: 9 }
    });

    if (!tryAgainPrize) {
      tryAgainPrize = await prisma.spin_prizes.findFirst({
        where: { name: { contains: 'Try Again' } }
      });

      if (!tryAgainPrize) {
        tryAgainPrize = await prisma.spin_prizes.create({
          data: {
            position: 9,
            name: "Oops Try AgainðŸ¥²",
            value: 0.00,
            weight: 150,
            probability: 0.15,
            color: "#ef4444",
            icon: "Frown",
            status: true
          }
        });
      } else {
        tryAgainPrize = await prisma.spin_prizes.update({
          where: { id: tryAgainPrize.id },
          data: { position: 9 }
        });
      }
    }

    const activePrizes = await prisma.spin_prizes.findMany({
      where: {
        status: true,
        position: { lte: 8 }
      },
      orderBy: { position: 'asc' },
      take: 8
    });

    const prizes = [];
    for (let i = 0; i < 8; i++) {
      if (activePrizes[i]) {
        prizes.push(activePrizes[i]);
      } else {
        prizes.push({
          id: `placeholder-${i}`,
          name: `R0.00`,
          value: 0.00,
          weight: 100,
          position: i + 1,
          status: true,
          color: i % 2 === 0 ? "#3b82f6" : "#60a5fa",
          icon: "Coins"
        });
      }
    }
    prizes.push(tryAgainPrize);

    if (prizes.length === 0) {
      return res.status(500).json({ success: false, message: 'No prizes configured' });
    }

    // Roulette Wheel Selection using weights
    const totalWeight = prizes.reduce((sum, p) => sum + Number(p.weight), 0);
    let randomNum = Math.random() * totalWeight;
    let selectedPrize = prizes[0];
    let selectedIndex = 0;

    for (let i = 0; i < prizes.length; i++) {
      randomNum -= Number(prizes[i].weight);
      if (randomNum <= 0) {
        selectedPrize = prizes[i];
        selectedIndex = i;
        break;
      }
    }

    const rewardAmount = Number(selectedPrize.value);
    let currentBalance = Number(user.balance || 0);

    // Process the transaction using a Prisma transaction to ensure consistency
    await prisma.$transaction(async (tx) => {
      // 1. Deduct cost or process free spin
      if (spinType === 'free') {
        await tx.user_spins.update({
          where: { user_id: userId },
          data: {
            free_spins_remaining: { decrement: 1 },
            total_spins_used: { increment: 1 },
            total_rewards_earned: { increment: rewardAmount }
          }
        });
      } else {
        await tx.users.update({
          where: { id: userId },
          data: { balance: { decrement: cost } }
        });
        await tx.user_spins.update({
          where: { user_id: userId },
          data: {
            total_spins_used: { increment: 1 },
            total_rewards_earned: { increment: rewardAmount }
          }
        });

        const balanceAfterCost = currentBalance - cost;
        // Log transaction for the cost
        if (cost > 0) {
          await tx.transactions.create({
            data: {
              user_id: userId,
              type: 'spin_cost',
              amount: cost,
              balance_before: currentBalance,
              balance_after: balanceAfterCost,
              description: 'Spin Wheel Cost'
            }
          });
        }
        currentBalance = balanceAfterCost;
      }

      // 2. Add reward to withdrawable_balance if > 0
      if (rewardAmount > 0) {
        await tx.users.update({
          where: { id: userId },
          data: { withdrawable_balance: { increment: rewardAmount } }
        });

        const withdrawableBefore = Number(user.withdrawable_balance || 0);
        const withdrawableAfter = withdrawableBefore + rewardAmount;

        // Log transaction for reward
        await tx.transactions.create({
          data: {
            user_id: userId,
            type: 'spin_reward',
            amount: rewardAmount,
            balance_before: withdrawableBefore,
            balance_after: withdrawableAfter,
            description: `Won ${selectedPrize.name} from Spin Wheel`
          }
        });
      }

      // 3. Log the spin
      await tx.spin_logs.create({
        data: {
          user_id: userId,
          prize_id: selectedPrize.id.startsWith('placeholder') ? tryAgainPrize.id : selectedPrize.id,
          spin_type: spinType,
          reward_earned: rewardAmount
        }
      });
    });

    await logActivity(userId, 'spin wheel', req, { spinType, rewardAmount, prizeName: selectedPrize.name });

    res.json({
      success: true,
      data: {
        prize: selectedPrize,
        prizeIndex: selectedIndex,
        spinType,
        rewardAmount
      }
    });

  } catch (error) {
    console.error('Play spin error:', error);
    res.status(500).json({ success: false, message: 'An error occurred while spinning' });
  }
});

router.post('/deposit', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, cryptoId, paymentMethod } = req.body;

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    let cryptoLabel = "Official Recharge (Bank Transfer)";
    if (cryptoId) {
      const cryptoOption = await prisma.payout_cryptocurrencies.findUnique({
        where: { id: cryptoId }
      });
      if (cryptoOption) {
        cryptoLabel = `${cryptoOption.symbol} (${cryptoOption.network})`;
      }
    } else if (paymentMethod) {
      cryptoLabel = paymentMethod;
    }

    // Fetch global settings for deposit limits
    const settings = await prisma.settings.findFirst();
    const minDep = Number(settings?.min_deposit || 1000);
    const maxDep = Number(settings?.max_deposit || 10000000);
    const symbol = settings?.currency_symbol || 'R';

    if (Number(amount) < minDep || Number(amount) > maxDep) {
      return res.status(400).json({ success: false, message: `Amount must be between ${symbol}${minDep} and ${symbol}${maxDep}` });
    }

    // Create deposit record directly for admin review
    const chargePercent = Number(settings?.deposit_charge || 0);
    const totalAmount = Number(amount) * (1 + chargePercent / 100);

    const deposit = await prisma.deposits.create({
      data: {
        user_id: userId,
        amount: Number(amount),
        cryptocurrency: cryptoLabel,
        status: 'PENDING',
      }
    });

    await logActivity(userId, 'deposit initiated', req, { amount, cryptocurrency: cryptoLabel });

    return res.json({
      success: true,
      message: 'Deposit request submitted successfully. Awaiting admin review.',
      deposit,
      payableAmount: totalAmount
    });

  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({ success: false, message: 'An error occurred while processing deposit' });
  }
});

router.post('/withdraw', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, network, wallet_address, password, method, bank_name, account_number, account_name } = req.body;

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid withdrawal amount is required' });
    }

    // Fetch global settings
    const settings = await prisma.settings.findFirst();
    const minAmount = Number(settings?.min_withdrawal || 100);
    const maxAmount = Number(settings?.max_withdrawal || 5000000);
    const feeRate = Number(settings?.withdrawal_charge || 15) / 100;
    const symbol = settings?.currency_symbol || 'R';

    if (Number(amount) < minAmount) {
      return res.status(400).json({ success: false, message: `Minimum withdrawal amount is ${symbol}${minAmount.toLocaleString()}` });
    }

    if (Number(amount) > maxAmount) {
      return res.status(400).json({ success: false, message: `Maximum withdrawal amount is ${symbol}${maxAmount.toLocaleString()}` });
    }

    const user = await prisma.users.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify withdrawal password if provided and user has withdrawal pin
    if (password && user.withdrawal_pin) {
      const isPasswordValid = await bcrypt.compare(password, user.withdrawal_pin);
      if (!isPasswordValid) {
        return res.status(400).json({ success: false, message: 'Incorrect withdrawal password' });
      }
    }

    const withdrawableBal = Number(user.withdrawable_balance || 0);
    const mainBal = Number(user.balance || 0);
    const totalAvail = Math.max(withdrawableBal, mainBal);

    if (totalAvail < Number(amount)) {
      return res.status(400).json({ success: false, message: 'Insufficient withdrawable balance' });
    }

    const fees = Number(amount) * feeRate;
    const netAmount = Number(amount) - fees;

    const destAddress = wallet_address || (account_number ? `${bank_name || 'Bank'}: ${account_number} (${account_name || ''})` : 'Direct Bank Transfer');
    const withdrawMethod = method || (bank_name ? `Bank Transfer (${bank_name})` : 'Bank Transfer');

    let withdrawalResult;
    await prisma.$transaction(async (tx) => {
      const numAmount = Number(amount);

      // Deduct balance
      if (withdrawableBal >= numAmount) {
        await tx.users.update({
          where: { id: userId },
          data: {
            withdrawable_balance: { decrement: numAmount }
          }
        });
      } else {
        await tx.users.update({
          where: { id: userId },
          data: {
            balance: { decrement: numAmount }
          }
        });
      }

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
          balance_before: totalAvail,
          balance_after: totalAvail - numAmount,
          reference_id: withdrawalResult.id,
          description: `Withdrawal request to ${destAddress}`
        }
      });
    });

    await logActivity(userId, 'withdrawal requested', req, { amount, fees, net_amount: netAmount, destination: destAddress });

    // Send withdrawal notification email
    try {
      await sendWithdrawalNotificationEmail({
        email: req.user.email,
        name: req.user.full_name || req.user.username || 'User',
        crypto: withdrawMethod,
        amount: Number(amount),
        walletAddress: destAddress,
        status: 'pending',
        date: new Date()
      });
    } catch (e) {
      console.warn('Withdrawal email failed:', e.message);
    }

    return res.json({
      success: true,
      message: 'Withdrawal request submitted successfully. Awaiting approval.',
      withdrawal: withdrawalResult
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ success: false, message: 'Failed to process withdrawal request' });
  }
});

// GET /users/daily-checkin - Get daily checkin streak & rewards
router.get('/daily-checkin', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    let checkinConfig = await prisma.daily_checkins.findMany({
      where: { status: true },
      orderBy: { day_number: 'asc' }
    });

    if (checkinConfig.length === 0) {
      const defaults = [
        { day_number: 1, reward_amount: 5, description: 'Day 1 Check-in Reward' },
        { day_number: 2, reward_amount: 10, description: 'Day 2 Check-in Reward' },
        { day_number: 3, reward_amount: 15, description: 'Day 3 Check-in Reward' },
        { day_number: 4, reward_amount: 20, description: 'Day 4 Check-in Reward' },
        { day_number: 5, reward_amount: 25, description: 'Day 5 Check-in Reward' },
        { day_number: 6, reward_amount: 30, description: 'Day 6 Check-in Reward' },
        { day_number: 7, reward_amount: 50, description: 'Day 7 Check-in Reward' }
      ];
      for (const item of defaults) {
        await prisma.daily_checkins.create({ data: item });
      }
      checkinConfig = await prisma.daily_checkins.findMany({
        where: { status: true },
        orderBy: { day_number: 'asc' }
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const history = await prisma.user_checkins.findMany({
      where: { user_id: userId },
      orderBy: { checkin_date: 'desc' },
      take: 7
    });

    let currentStreak = 0;
    let claimedToday = false;
    let lastClaimDate = null;

    if (history.length > 0) {
      lastClaimDate = new Date(history[0].checkin_date);
      lastClaimDate.setHours(0, 0, 0, 0);

      if (lastClaimDate.getTime() === today.getTime()) {
        claimedToday = true;
        currentStreak = history[0].day_number;
      } else {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (lastClaimDate.getTime() === yesterday.getTime()) {
          currentStreak = history[0].day_number;
        } else {
          currentStreak = 0;
        }
      }
    }

    const maxDays = checkinConfig.length;
    let nextDayNumber = currentStreak + 1;
    if (nextDayNumber > maxDays) {
      if (!claimedToday) {
        currentStreak = 0;
        nextDayNumber = 1;
      }
    }

    const rewards = checkinConfig.map(config => ({
      day: config.day_number,
      amount: config.reward_amount,
      status: config.day_number <= currentStreak 
        ? 'claimed' 
        : (config.day_number === (claimedToday ? currentStreak : currentStreak + 1) 
            ? (claimedToday ? 'claimed' : 'available') 
            : 'locked')
    }));

    res.json({
      success: true,
      enabled: user.can_access_checkin ?? true,
      claimedToday,
      currentStreak,
      maxDays,
      rewards
    });
  } catch (error) {
    console.error('Checkin status error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch checkin status' });
  }
});

// POST /users/daily-checkin/claim - Claim daily checkin reward
router.post('/daily-checkin/claim', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.users.findUnique({ where: { id: userId } });

    if (!user || user.can_access_checkin === false) {
      return res.status(403).json({ success: false, error: 'Check-in is disabled' });
    }

    const checkinConfig = await prisma.daily_checkins.findMany({
      where: { status: true },
      orderBy: { day_number: 'asc' }
    });

    if (checkinConfig.length === 0) {
      return res.status(400).json({ success: false, error: 'Daily check-in is currently unavailable' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const history = await prisma.user_checkins.findMany({
      where: { user_id: userId },
      orderBy: { checkin_date: 'desc' },
      take: 1
    });

    let currentStreak = 0;
    if (history.length > 0) {
      const lastClaimDate = new Date(history[0].checkin_date);
      lastClaimDate.setHours(0, 0, 0, 0);

      if (lastClaimDate.getTime() === today.getTime()) {
        return res.status(400).json({ success: false, error: 'Already claimed today' });
      }

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastClaimDate.getTime() === yesterday.getTime()) {
        currentStreak = history[0].day_number;
      }
    }

    const maxDays = checkinConfig.length;
    let claimDay = currentStreak + 1;
    if (claimDay > maxDays) {
      claimDay = 1;
    }

    const rewardConfig = checkinConfig.find(c => c.day_number === claimDay);
    if (!rewardConfig) {
      return res.status(400).json({ success: false, error: 'Reward configuration error' });
    }

    const rewardAmount = Number(rewardConfig.reward_amount);

    await prisma.$transaction(async (tx) => {
      await tx.user_checkins.create({
        data: {
          user_id: userId,
          day_number: claimDay,
          reward_amount: rewardAmount,
          checkin_date: new Date()
        }
      });

      const updatedUser = await tx.users.update({
        where: { id: userId },
        data: {
          balance: { increment: rewardAmount },
          withdrawable_balance: { increment: rewardAmount }
        }
      });

      const balanceBefore = Number(user.balance);
      const balanceAfter = Number(updatedUser.balance);

      await tx.transactions.create({
        data: {
          user_id: userId,
          type: 'daily_reward',
          amount: rewardAmount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          description: `Daily Check-in reward (Day ${claimDay})`
        }
      });
    });

    const settings = await prisma.settings.findFirst();
    const symbol = settings?.currency_symbol || 'R';

    res.json({
      success: true,
      message: `Successfully claimed ${symbol}${rewardAmount} for Day ${claimDay}`,
      amount: rewardAmount,
      day: claimDay
    });
  } catch (error) {
    console.error('Checkin claim error:', error);
    res.status(500).json({ success: false, error: 'Failed to claim reward' });
  }
});

export default router;


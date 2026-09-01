import fs from 'fs';

// 1. Update omni-backend/src/routes/user.js
const userFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\user.js';
let userContent = fs.readFileSync(userFile, 'utf8');

// Replace strict uppercase status: 'APPROVED' with case-insensitive list for deposits and withdrawals
userContent = userContent.replaceAll("status: 'APPROVED'", "status: { in: ['APPROVED', 'approved', 'SUCCESS', 'success'] }");
userContent = userContent.replaceAll("status: 'approved'", "status: { in: ['APPROVED', 'approved', 'SUCCESS', 'success'] }");

// Normalize deposit creation status when webhook auto-approves
userContent = userContent.replaceAll("status: 'approved'", "status: 'APPROVED'");

fs.writeFileSync(userFile, userContent, 'utf8');
console.log('✅ Standardized routes/user.js to case-insensitively match all APPROVED/approved deposits and withdrawals for user stats!');

// 2. Update omni-backend/src/routes/admin/dashboard.js
const adminDashFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\admin\\dashboard.js';
let adminDashContent = fs.readFileSync(adminDashFile, 'utf8');

const updatedAdminDashCode = `import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/stats', async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeUsers,
      todayUsers,
      usersBalances,
      allDeposits,
      allWithdrawals,
      investmentsStats,
      todayDepositsStats,
      todayWithdrawalsStats,
      todayInvestmentsStats,
      cumulativeInvestmentsStats
    ] = await Promise.all([
      prisma.users.count(),
      prisma.users.count({ where: { is_active: true } }),
      prisma.users.count({ where: { created_at: { gte: todayStart } } }),
      prisma.users.aggregate({ _sum: { balance: true } }),

      // All deposits
      prisma.deposits.findMany({ select: { amount: true, status: true } }),

      // All withdrawals
      prisma.withdrawals.findMany({ select: { amount: true, status: true } }),

      // Active Investments
      prisma.investments.aggregate({
        where: { status: 'ACTIVE' },
        _count: true,
        _sum: { amount: true, total_paid: true }
      }),

      // Today Deposits
      prisma.deposits.aggregate({
        where: { 
          status: { in: ['APPROVED', 'approved', 'SUCCESS', 'success'] }, 
          created_at: { gte: todayStart } 
        },
        _sum: { amount: true }
      }),

      // Today Withdrawals
      prisma.withdrawals.aggregate({
        where: { 
          status: { in: ['APPROVED', 'approved', 'SUCCESS', 'success'] }, 
          created_at: { gte: todayStart } 
        },
        _sum: { amount: true }
      }),

      // Today Investments
      prisma.investments.aggregate({
        where: { created_at: { gte: todayStart } },
        _sum: { amount: true }
      }),

      // Cumulative Investments
      prisma.investments.aggregate({
        _sum: { amount: true }
      })
    ]);

    // Aggregate deposits robustly (case-insensitive status check)
    let pendingDepositsCount = 0, pendingDepositsSum = 0;
    let approvedDepositsCount = 0, approvedDepositsSum = 0;

    allDeposits.forEach(d => {
      const st = (d.status || '').toUpperCase();
      const amt = Number(d.amount || 0);
      if (st === 'APPROVED' || st === 'SUCCESS') {
        approvedDepositsCount++;
        approvedDepositsSum += amt;
      } else if (st === 'PENDING') {
        pendingDepositsCount++;
        pendingDepositsSum += amt;
      }
    });

    // Aggregate withdrawals robustly (case-insensitive status check)
    let pendingWithdrawalsCount = 0, pendingWithdrawalsSum = 0;
    let approvedWithdrawalsCount = 0, approvedWithdrawalsSum = 0;

    allWithdrawals.forEach(w => {
      const st = (w.status || '').toUpperCase();
      const amt = Number(w.amount || 0);
      if (st === 'APPROVED' || st === 'SUCCESS' || st === 'COMPLETED') {
        approvedWithdrawalsCount++;
        approvedWithdrawalsSum += amt;
      } else if (st === 'PENDING') {
        pendingWithdrawalsCount++;
        pendingWithdrawalsSum += amt;
      }
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        todayUsers,
        
        totalAssets: Number(usersBalances._sum.balance || 0),
        assetsValue: approvedDepositsSum + Number(usersBalances._sum.balance || 0),
        inProgressAssetsCount: investmentsStats._count || 0,
        inProgressAssetsSum: Number(investmentsStats._sum.amount || 0),
        cumulativeInvestmentsSum: Number(cumulativeInvestmentsStats._sum.amount || 0),
        
        pendingDepositsCount,
        approvedDepositsCount,
        pendingWithdrawalsCount,
        approvedWithdrawalsCount,

        pendingDepositsSum,
        approvedDepositsSum,
        pendingWithdrawalsSum,
        approvedWithdrawalsSum,

        todayDepositsSum: Number(todayDepositsStats._sum.amount || 0),
        todayWithdrawalsSum: Number(todayWithdrawalsStats._sum.amount || 0),
        todayInvestmentsSum: Number(todayInvestmentsStats._sum.amount || 0),
        
        totalInterestAmount: Number(investmentsStats._sum.total_paid || 0)
      }
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
});

export default router;`;

fs.writeFileSync(adminDashFile, updatedAdminDashCode, 'utf8');
console.log('✅ Enhanced routes/admin/dashboard.js with case-insensitive aggregation for deposit/withdrawal stats!');

// 3. Update omni-backend/src/routes/index.js to always save 'APPROVED' in uppercase
const indexFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\index.js';
let indexContent = fs.readFileSync(indexFile, 'utf8');
indexContent = indexContent.replaceAll("status: 'approved'", "status: 'APPROVED'");
fs.writeFileSync(indexFile, indexContent, 'utf8');
console.log('✅ Updated routes/index.js to set status: APPROVED in uppercase!');

// 4. Update existing lowercase 'approved' deposits in database to uppercase 'APPROVED'
const normalizeScript = `import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function normalizeDB() {
  await prisma.deposits.updateMany({
    where: { status: 'approved' },
    data: { status: 'APPROVED' }
  });
  await prisma.withdrawals.updateMany({
    where: { status: 'approved' },
    data: { status: 'APPROVED' }
  });
  console.log('✅ All existing DB records normalized to uppercase APPROVED!');
  await prisma.$disconnect();
}
normalizeDB();`;

fs.writeFileSync('C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\normalize_db_statuses.js', normalizeScript, 'utf8');
console.log('✅ Created normalize_db_statuses.js script!');

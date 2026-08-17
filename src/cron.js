import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Automated Daily Profit Payout Engine
// Runs every 1 minute to check for investments that are due for daily return payouts
export const initCronJobs = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const activeInvestments = await prisma.investments.findMany({
        where: {
          status: 'ACTIVE'
        },
        include: {
          plan: true,
          profits: {
            orderBy: {
              paid_date: 'desc'
            },
            take: 1
          }
        }
      });

      const now = new Date();

      for (const inv of activeInvestments) {
        // Find the last payout date, or fallback to start_date
        const lastPayoutDate = inv.profits.length > 0
          ? new Date(inv.profits[0].paid_date)
          : new Date(inv.start_date);

        // Calculate hours passed since the last payout
        const diffMs = now.getTime() - lastPayoutDate.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        // Calculate number of full 24-hour cycles due
        const cyclesDue = Math.floor(diffHours / 24);

        if (cyclesDue >= 1) {
          const profitAmount = parseFloat(inv.daily_profit);
          let currentTotalPaid = await prisma.investments.findUnique({
            where: { id: inv.id },
            select: { total_paid: true }
          });

          let shouldComplete = false;

          for (let i = 0; i < cyclesDue; i++) {
            // Determine the exact paid_date for this missing payout
            const precisePaidDate = new Date(lastPayoutDate.getTime() + ((i + 1) * 24 * 60 * 60 * 1000));

            // Log the profit generation
            await prisma.investment_profits.create({
              data: {
                investment_id: inv.id,
                user_id: inv.user_id,
                amount: profitAmount,
                paid_date: precisePaidDate
              }
            });

            // Add profit to withdrawable_balance
            const user = await prisma.users.findUnique({ where: { id: inv.user_id } });
            const newBalance = parseFloat(user.withdrawable_balance || 0) + profitAmount;

            await prisma.users.update({
              where: { id: inv.user_id },
              data: { withdrawable_balance: newBalance }
            });

            // Log the transaction
            await prisma.transactions.create({
              data: {
                user_id: inv.user_id,
                type: 'profit',
                amount: profitAmount,
                balance_before: parseFloat(user.withdrawable_balance || 0),
                balance_after: newBalance,
                description: `Daily profit payout for ${inv.plan.name}`,
                reference_id: inv.id
              }
            });

            // Update investment paid amounts
            const totalPaidStr = (parseFloat(currentTotalPaid.total_paid) + profitAmount).toFixed(8);

            await prisma.investments.update({
              where: { id: inv.id },
              data: {
                total_paid: totalPaidStr
              }
            });

            // Check if it reached end_date
            if (precisePaidDate >= new Date(inv.end_date)) {
              shouldComplete = true;
              break;
            }
          }

          if (shouldComplete) {
            await prisma.investments.update({
              where: { id: inv.id },
              data: { status: 'COMPLETED' }
            });
          }
        } else if (now >= new Date(inv.end_date)) {
          await prisma.investments.update({
             where: { id: inv.id },
             data: { status: 'COMPLETED' }
          });
        }
      }
    } catch (error) {
      console.error('Error running daily profit cron:', error);
    }
  });

  console.log('[CRON] Automated Daily Profit Payout Engine initialized.');
};

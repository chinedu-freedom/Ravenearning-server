import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Process daily profit payouts for active investments
const runProfitPayouts = async () => {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay();

    // Skip daily profit payouts on Sunday (0 = Sunday)
    if (dayOfWeek === 0) {
      return;
    }

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

    const settings = await prisma.settings.findFirst();

    for (const inv of activeInvestments) {
      const isActivitySeries = inv.plan?.category === 'Activity Series';

      if (isActivitySeries) {
        // --- ACTIVITY SERIES: Pay full lump sum ONLY when plan duration ends ---
        if (now >= new Date(inv.end_date)) {
          const durationDays = Number(inv.plan?.duration || 1);
          const totalProfits = parseFloat(inv.daily_profit || 0) * durationDays;
          const totalPayout = inv.plan?.total_revenue 
            ? parseFloat(inv.plan.total_revenue) 
            : (parseFloat(inv.amount || 0) + totalProfits);

          const user = await prisma.users.findUnique({ where: { id: inv.user_id } });
          if (user) {
            const oldBal = parseFloat(user.withdrawable_balance || 0);
            const newBal = oldBal + totalPayout;

            // Credit total lump sum to withdrawable balance
            await prisma.users.update({
              where: { id: inv.user_id },
              data: { withdrawable_balance: newBal }
            });

            // Log profit record
            await prisma.investment_profits.create({
              data: {
                investment_id: inv.id,
                user_id: inv.user_id,
                amount: totalPayout,
                paid_date: now
              }
            });

            // Log transaction
            await prisma.transactions.create({
              data: {
                user_id: inv.user_id,
                type: 'profit',
                amount: totalPayout,
                balance_before: oldBal,
                balance_after: newBal,
                description: `Activity Series Lump Sum Maturity Payout for ${inv.plan.name}`,
                reference_id: inv.id
              }
            });
          }

          // Mark investment as COMPLETED
          await prisma.investments.update({
            where: { id: inv.id },
            data: {
              status: 'COMPLETED',
              total_paid: totalPayout.toFixed(8)
            }
          });
        }
        // Skip daily payouts for Activity Series
        continue;
      }

      // --- VIP SERIES: Standard Daily Profit Payouts ---
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

          // Log the profit transaction
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

          // --- Distribute Team Daily Rebates to Uplines (Level 1, 2, 3) ---
          if (settings) {
            let currentDownline = user;
            const rebateLevels = [
              { rate: Number(settings.level1_commission || 30) },
              { rate: Number(settings.level2_commission || 10) },
              { rate: Number(settings.level3_commission || 5) }
            ];

            for (let lvl = 0; lvl < rebateLevels.length; lvl++) {
              if (!currentDownline || !currentDownline.referred_by || rebateLevels[lvl].rate <= 0) break;

              const referrerId = currentDownline.referred_by;
              const referrer = await prisma.users.findUnique({ where: { id: referrerId } });
              if (!referrer) break;

              const rebateAmount = Number((profitAmount * (rebateLevels[lvl].rate / 100)).toFixed(2));
              if (rebateAmount > 0) {
                const oldBal = Number(referrer.withdrawable_balance || 0);
                const newBal = oldBal + rebateAmount;

                await prisma.users.update({
                  where: { id: referrerId },
                  data: { withdrawable_balance: newBal }
                });

                // Log referral commission audit record
                await prisma.referral_commissions.create({
                  data: {
                    user_id: referrerId,
                    from_user_id: inv.user_id,
                    amount: rebateAmount,
                    level: lvl + 1,
                    description: `Daily Team Rebate (Level ${lvl + 1}) from ${user.phone || user.username || 'Downline'}'s daily profit payout`
                  }
                }).catch(() => {});

                // Log transaction for referrer
                await prisma.transactions.create({
                  data: {
                    user_id: referrerId,
                    type: 'referral_commission',
                    amount: rebateAmount,
                    balance_before: oldBal,
                    balance_after: newBal,
                    description: `Daily Team Rebate (Level ${lvl + 1}) from ${user.phone || user.username || 'Downline'} payout`,
                    reference_id: inv.id
                  }
                });
              }

              currentDownline = referrer;
            }
          }

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
};

// Automated Daily Profit Payout Engine
// Runs every 60 seconds natively without external packages
export const initCron = () => {
  // Run once immediately on start
  runProfitPayouts();

  // Schedule to run every 60 seconds (1 minute)
  setInterval(runProfitPayouts, 60 * 1000);

  console.log('[CRON] Automated Daily Profit Payout Engine initialized (Interval: 60s).');
};

export const initCronJobs = initCron;
export default initCron;

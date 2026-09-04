import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Process daily profit payouts for active investments
export const runProfitPayouts = async () => {
  try {
    const now = new Date();

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
      try {
        const planName = inv.plan?.name || 'VIP Package';
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
            if (user && user.is_active && user.can_earn_daily !== false) {
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
                  description: `Activity Series Lump Sum Maturity Payout for ${planName}`,
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
        const user = await prisma.users.findUnique({ where: { id: inv.user_id } });
        if (!user || user.is_active === false || user.can_earn_daily === false) {
          continue;
        }

        const lastPayoutDate = inv.profits.length > 0
          ? new Date(inv.profits[0].paid_date)
          : new Date(inv.start_date);

        // Calculate hours passed since the last payout
        const diffMs = now.getTime() - lastPayoutDate.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        // Calculate number of full 24-hour cycles due (with 0.2 hour tolerance for cron interval drift)
        const cyclesDue = Math.floor((diffHours + 0.2) / 24);

        if (cyclesDue >= 1) {
          const profitAmount = parseFloat(inv.daily_profit || 0);
          if (profitAmount <= 0) continue;

          let invRecord = await prisma.investments.findUnique({
            where: { id: inv.id },
            select: { total_paid: true }
          });
          let runningTotalPaid = parseFloat(invRecord?.total_paid || 0);

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

            // Re-fetch user to get latest balance for accurate calculation
            const currentUser = await prisma.users.findUnique({ where: { id: inv.user_id } });
            const oldUserBal = parseFloat(currentUser?.withdrawable_balance || 0);
            const newUserBal = oldUserBal + profitAmount;

            await prisma.users.update({
              where: { id: inv.user_id },
              data: { withdrawable_balance: newUserBal }
            });

            // Log the profit transaction
            await prisma.transactions.create({
              data: {
                user_id: inv.user_id,
                type: 'profit',
                amount: profitAmount,
                balance_before: oldUserBal,
                balance_after: newUserBal,
                description: `Daily profit payout for ${planName}`,
                reference_id: inv.id
              }
            });

            // --- Distribute Team Daily Rebates to Uplines (Level 1, 2, 3) ---
            if (settings) {
              let currentDownline = currentUser;
              const rebateLevels = [
                { rate: Number(settings.level1_commission || 30) },
                { rate: Number(settings.level2_commission || 10) },
                { rate: Number(settings.level3_commission || 5) }
              ];

              for (let lvl = 0; lvl < rebateLevels.length; lvl++) {
                if (!currentDownline || !currentDownline.referred_by || rebateLevels[lvl].rate <= 0) break;

                const referrerId = currentDownline.referred_by;
                const referrer = await prisma.users.findUnique({ where: { id: referrerId } });
                if (!referrer || referrer.can_earn_referral === false) break;

                const rebateAmount = Number((profitAmount * (rebateLevels[lvl].rate / 100)).toFixed(2));
                if (rebateAmount > 0) {
                  const oldBal = Number(referrer.withdrawable_balance || 0);
                  const newBal = oldBal + rebateAmount;

                  await prisma.users.update({
                    where: { id: referrerId },
                    data: { withdrawable_balance: newBal }
                  });

                  const downlineName = currentUser.phone || currentUser.username || currentUser.full_name || 'Downline';

                  // Log referral commission audit record
                  await prisma.referral_commissions.create({
                    data: {
                      user_id: referrerId,
                      from_user_id: inv.user_id,
                      amount: rebateAmount,
                      level: lvl + 1,
                      description: `Daily Team Rebate (Level ${lvl + 1}) from ${downlineName}'s daily profit payout`
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
                      description: `Daily Team Rebate (Level ${lvl + 1}) from ${downlineName} payout`,
                      reference_id: inv.id
                    }
                  });
                }

                currentDownline = referrer;
              }
            }

            // Update running total paid for investment
            runningTotalPaid += profitAmount;

            await prisma.investments.update({
              where: { id: inv.id },
              data: {
                total_paid: runningTotalPaid.toFixed(8)
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
      } catch (invErr) {
        console.error(`Error processing profit payout for investment ${inv.id}:`, invErr);
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


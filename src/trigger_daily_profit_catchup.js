import { runProfitPayouts } from './cron.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== RUNNING DAILY PROFIT PAYOUT CATCH-UP ENGINE ===');
  console.log('Timestamp:', new Date().toISOString());

  const initialProfitsCount = await prisma.investment_profits.count();

  await runProfitPayouts();

  const finalProfitsCount = await prisma.investment_profits.count();
  const newPayouts = finalProfitsCount - initialProfitsCount;

  console.log(`=== SUCCESS! Processed daily profits. New payout records created: ${newPayouts} ===`);
  process.exit(0);
}

main().catch(err => {
  console.error('Catch-up script failed:', err);
  process.exit(1);
});

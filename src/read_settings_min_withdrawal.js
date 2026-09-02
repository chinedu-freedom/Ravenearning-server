import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function readMinWithdrawal() {
  const settings = await prisma.settings.findFirst();
  console.log('=== PLATFORM SETTINGS IN DB ===');
  console.log(`min_withdrawal: ${settings?.min_withdrawal}`);
  console.log(`max_withdrawal: ${settings?.max_withdrawal}`);
  console.log(`withdrawal_charge: ${settings?.withdrawal_charge}%`);
  console.log(`quickpay_enabled: ${settings?.quickpay_enabled}`);
  console.log(`quickpay_merchant: ${settings?.quickpay_merchant}`);
  console.log(`quickpay_payout_channel: ${settings?.quickpay_payout_channel}`);
  await prisma.$disconnect();
}

readMinWithdrawal();

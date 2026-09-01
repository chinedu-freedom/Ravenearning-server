import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStatuses() {
  const depositStatuses = await prisma.deposits.groupBy({
    by: ['status'],
    _count: true,
    _sum: { amount: true }
  });

  const withdrawalStatuses = await prisma.withdrawals.groupBy({
    by: ['status'],
    _count: true,
    _sum: { amount: true }
  });

  console.log('=== DEPOSIT STATUSES IN DB ===');
  console.log(JSON.stringify(depositStatuses, null, 2));

  console.log('\n=== WITHDRAWAL STATUSES IN DB ===');
  console.log(JSON.stringify(withdrawalStatuses, null, 2));

  await prisma.$disconnect();
}

checkStatuses();

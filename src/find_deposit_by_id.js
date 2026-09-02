import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDeposits() {
  const d1 = await prisma.deposits.findUnique({ where: { id: '18c2cd60-96f3-4571-9c01-76ddc0f79e19' } });
  const d2 = await prisma.deposits.findUnique({ where: { id: 'b65f6d50-927b-468c-8e52-ffaed51d841c' } });
  console.log('Deposit 1:', d1);
  console.log('Deposit 2:', d2);
  await prisma.$disconnect();
}

checkDeposits();

import { PrismaClient } from '@prisma/client';
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
normalizeDB();
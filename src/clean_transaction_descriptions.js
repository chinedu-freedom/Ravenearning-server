import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanTransactions() {
  console.log('Cleaning transaction descriptions in database...');

  // Update Manual Credit descriptions
  const creditUpdate = await prisma.transactions.updateMany({
    where: {
      OR: [
        { description: { contains: 'Manual credit' } },
        { description: { contains: 'credit' } },
        { type: 'ADMIN_CREDIT' }
      ]
    },
    data: {
      description: 'Deposit'
    }
  });
  console.log(`Updated ${creditUpdate.count} credit transactions to 'Deposit'.`);

  // Update Manual Debit descriptions
  const debitUpdate = await prisma.transactions.updateMany({
    where: {
      OR: [
        { description: { contains: 'Manual debit' } },
        { description: { contains: 'debit' } },
        { type: 'ADMIN_DEBIT' }
      ]
    },
    data: {
      description: 'Withdrawal'
    }
  });
  console.log(`Updated ${debitUpdate.count} debit transactions to 'Withdrawal'.`);

  console.log('Database cleanup completed successfully.');
}

cleanTransactions()
  .catch((e) => {
    console.error('Error cleaning transactions:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== CLEANING TRANSACTION DESCRIPTIONS IN DATABASE ===');

  const transactions = await prisma.transactions.findMany();
  let count = 0;

  for (const t of transactions) {
    const desc = (t.description || '').toLowerCase();
    const type = (t.type || '').toLowerCase();

    let newDesc = t.description;
    if (type.includes('deposit') || desc.includes('quick pay') || desc.includes('gateway') || desc.includes('direct bank') || desc.includes('official recharge')) {
      newDesc = 'Deposit';
    } else if (type.includes('withdraw') || desc.includes('withdraw')) {
      newDesc = 'Withdrawal';
    }

    if (newDesc !== t.description) {
      await prisma.transactions.update({
        where: { id: t.id },
        data: { description: newDesc }
      });
      count++;
    }
  }

  // Also clean cryptocurrency field in deposits if containing gateway text
  const deposits = await prisma.deposits.findMany();
  for (const d of deposits) {
    if (d.cryptocurrency && /quick pay|gateway|direct bank|official/i.test(d.cryptocurrency)) {
      await prisma.deposits.update({
        where: { id: d.id },
        data: { cryptocurrency: 'Deposit' }
      });
    }
  }

  console.log(`Successfully cleaned ${count} transaction descriptions in database!`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

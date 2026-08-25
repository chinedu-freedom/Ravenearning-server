import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function giveUserBalance() {
  const user = await prisma.users.findFirst({
    where: {
      phone: {
        endsWith: '8158051119'
      }
    }
  });

  if (!user) {
    console.error('User with phone 8158051119 not found!');
    await prisma.$disconnect();
    return;
  }

  const updated = await prisma.users.update({
    where: { id: user.id },
    data: {
      balance: 1000.00
    }
  });

  console.log(`Successfully updated user ${user.phone} (${user.full_name}) balance to R${updated.balance}`);
  await prisma.$disconnect();
}

giveUserBalance();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const newRewards = [
    { day_number: 1, reward_amount: 1, description: 'Day 1 Check-in Reward' },
    { day_number: 2, reward_amount: 2, description: 'Day 2 Check-in Reward' },
    { day_number: 3, reward_amount: 3, description: 'Day 3 Check-in Reward' },
    { day_number: 4, reward_amount: 4, description: 'Day 4 Check-in Reward' },
    { day_number: 5, reward_amount: 5, description: 'Day 5 Check-in Reward' },
    { day_number: 6, reward_amount: 6, description: 'Day 6 Check-in Reward' },
    { day_number: 7, reward_amount: 7, description: 'Day 7 Check-in Reward' }
  ];

  for (const item of newRewards) {
    const existing = await prisma.daily_checkins.findFirst({
      where: { day_number: item.day_number }
    });

    if (existing) {
      await prisma.daily_checkins.update({
        where: { id: existing.id },
        data: { reward_amount: item.reward_amount, description: item.description }
      });
    } else {
      await prisma.daily_checkins.create({ data: item });
    }
  }

  console.log('Successfully updated daily check-in rewards to R1 - R7!');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== UPDATING SPIN SETTINGS AND PRIZES ===');

  // 1. Update Spin Settings cost_per_spin to 50
  let settings = await prisma.spin_settings.findFirst();
  if (settings) {
    await prisma.spin_settings.update({
      where: { id: settings.id },
      data: { cost_per_spin: 50, feature_enabled: true }
    });
  } else {
    await prisma.spin_settings.create({
      data: { cost_per_spin: 50, daily_free_spins: 1, feature_enabled: true }
    });
  }
  console.log('Updated spin cost to R50!');

  // 2. Clear old prizes and seed new 8 prizes: 1, 5, 10, 50, 100, 500, 1000, 5000
  const newPrizes = [
    { position: 1, name: 'R 1.00', value: 1.00, weight: 10000, probability: 0.50, color: '#fefefe' },
    { position: 2, name: 'R 5.00', value: 5.00, weight: 5000, probability: 0.25, color: '#fdf6e3' },
    { position: 3, name: 'R 10.00', value: 10.00, weight: 3000, probability: 0.15, color: '#fefefe' },
    { position: 4, name: 'R 50.00', value: 50.00, weight: 1500, probability: 0.10, color: '#fdf6e3' },
    { position: 5, name: 'R 100.00', value: 100.00, weight: 0, probability: 0.00, color: '#fefefe' },
    { position: 6, name: 'R 500.00', value: 500.00, weight: 0, probability: 0.00, color: '#fdf6e3' },
    { position: 7, name: 'R 1000.00', value: 1000.00, weight: 0, probability: 0.00, color: '#fefefe' },
    { position: 8, name: 'R 5000.00', value: 5000.00, weight: 0, probability: 0.00, color: '#fdf6e3' },
  ];

  for (const item of newPrizes) {
    const existing = await prisma.spin_prizes.findFirst({
      where: { position: item.position }
    });

    if (existing) {
      await prisma.spin_prizes.update({
        where: { id: existing.id },
        data: {
          name: item.name,
          value: item.value,
          weight: item.weight,
          probability: item.probability,
          color: item.color,
          status: true
        }
      });
    } else {
      await prisma.spin_prizes.create({
        data: {
          position: item.position,
          name: item.name,
          value: item.value,
          weight: item.weight,
          probability: item.probability,
          color: item.color,
          status: true
        }
      });
    }
  }

  console.log('Successfully updated spin wheel prizes to R1, R5, R10, R50, R100, R500, R1000, R5000!');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

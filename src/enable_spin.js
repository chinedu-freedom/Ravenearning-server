import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.spin_settings.findFirst();
  if (existing) {
    await prisma.spin_settings.update({
      where: { id: existing.id },
      data: { feature_enabled: true }
    });
    console.log('Successfully enabled Spin Wheel in database!');
  } else {
    await prisma.spin_settings.create({
      data: {
        cost_per_spin: 10,
        free_spins_daily: 1,
        feature_enabled: true
      }
    });
    console.log('Successfully created & enabled Spin Wheel in database!');
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());

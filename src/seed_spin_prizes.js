import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSpin() {
  console.log("Seeding self-contained Raven spin wheel prizes and settings...");

  // Update or create spin settings
  let settings = await prisma.spin_settings.findFirst();
  const settingsData = {
    feature_enabled: true,
    free_spins_daily: 1,
    free_spins_per_deposit: 1,
    daily_referral_target: 1,
    spins_for_daily_challenge: 1,
    cost_per_spin: 10
  };

  if (!settings) {
    settings = await prisma.spin_settings.create({ data: settingsData });
  } else {
    settings = await prisma.spin_settings.update({
      where: { id: settings.id },
      data: settingsData
    });
  }

  // Clear existing prizes to reset to standard Raven ZAR prizes
  await prisma.spin_prizes.deleteMany({});

  const zarPrizes = [
    { position: 1, name: "R5.00", value: 5.00, weight: 300, probability: 0.30, color: "#3b82f6", icon: "Coins" },
    { position: 2, name: "R10.00", value: 10.00, weight: 150, probability: 0.15, color: "#3b82f6", icon: "Coins" },
    { position: 3, name: "R2.00", value: 2.00, weight: 250, probability: 0.25, color: "#3b82f6", icon: "Coins" },
    { position: 4, name: "R50.00", value: 50.00, weight: 50, probability: 0.05, color: "#3b82f6", icon: "Coins" },
    { position: 5, name: "R15.00", value: 15.00, weight: 100, probability: 0.10, color: "#3b82f6", icon: "Coins" },
    { position: 6, name: "R100.00", value: 100.00, weight: 20, probability: 0.02, color: "#3b82f6", icon: "Banknote" },
    { position: 7, name: "R25.00", value: 25.00, weight: 80, probability: 0.08, color: "#3b82f6", icon: "Coins" },
    { position: 8, name: "R500.00", value: 500.00, weight: 5, probability: 0.005, color: "#3b82f6", icon: "Banknote", is_jackpot: true },
    { position: 9, name: "Try Again", value: 0.00, weight: 120, probability: 0.12, color: "#ef4444", icon: "Frown" },
  ];

  for (const prize of zarPrizes) {
    await prisma.spin_prizes.create({ data: prize });
  }

  console.log("Raven spin prizes seeded successfully with ZAR values!");
}

seedSpin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

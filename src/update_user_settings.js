import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.settings.findFirst();

  const updateData = {
    min_withdrawal: 100,
    withdrawal_charge: 15,
    level1_commission: 30,
    level2_commission: 10,
    level3_commission: 5,
    level4_commission: 0,
    currency_symbol: "R",
    currency_name: "ZAR"
  };

  if (existing) {
    const updated = await prisma.settings.update({
      where: { id: existing.id },
      data: updateData
    });
    console.log("Updated settings in database:", updated);
  } else {
    const created = await prisma.settings.create({
      data: {
        site_name: "Ravenearning",
        site_title: "Ravenearning",
        timezone: "Africa/Johannesburg",
        welcome_bonus_destination: "balance",
        daily_withdrawal_limit: 500000,
        ...updateData
      }
    });
    console.log("Created settings in database:", created);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

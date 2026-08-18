import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function initSettings() {
  let settings = await prisma.settings.findFirst();
  const defaults = {
    site_name: "Ravenearning",
    site_title: "Ravenearning",
    currency_name: "ZAR",
    currency_symbol: "R",
    timezone: "Africa/Johannesburg",
    registration_bonus: 0,
    welcome_bonus_destination: "balance",
    min_deposit: 100,
    max_deposit: 10000000,
    daily_withdrawal_limit: 5000000,
    min_withdrawal: 100,
    withdrawal_charge: 15,
    level1_commission: 30,
    level2_commission: 10,
    level3_commission: 5,
    level4_commission: 0,
    live_market_enabled: true
  };

  if (!settings) {
    settings = await prisma.settings.create({
      data: defaults
    });
    console.log('Created default settings:', settings);
  } else {
    settings = await prisma.settings.update({
      where: { id: settings.id },
      data: defaults
    });
    console.log('Updated settings:', settings);
  }
}

initSettings()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

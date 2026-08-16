import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function initSettings() {
  let settings = await prisma.settings.findFirst();
  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        site_name: "Omni",
        site_title: "Omni",
        currency_name: "ZAR",
        currency_symbol: "R",
        timezone: "UTC",
        registration_bonus: 0,
        welcome_bonus_destination: "deposit",
        min_deposit: 1000,
        max_deposit: 10000000,
        daily_withdrawal_limit: 5000000,
        min_withdrawal: 1000,
        daily_checkin_enabled: true,
        live_market_enabled: true
      }
    });
    console.log('Created default settings with Naira (₦):', settings);
  } else {
    settings = await prisma.settings.update({
      where: { id: settings.id },
      data: {
        currency_name: "ZAR",
        currency_symbol: "R"
      }
    });
    console.log('Updated settings to Naira (₦):', settings);
  }
}

initSettings()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

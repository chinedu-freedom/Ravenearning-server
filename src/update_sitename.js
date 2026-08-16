import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function updateSiteName() {
  const settings = await prisma.settings.findFirst();
  if (settings) {
    await prisma.settings.update({
      where: { id: settings.id },
      data: {
        site_name: "Ravenearning",
        site_title: "Ravenearning"
      }
    });
    console.log('Database settings updated to Ravenearning!');
  } else {
    await prisma.settings.create({
      data: {
        site_name: "Ravenearning",
        site_title: "Ravenearning",
        currency_name: "NGN",
        currency_symbol: "₦",
        timezone: "UTC",
        min_deposit: 1000,
        max_deposit: 10000000,
        daily_withdrawal_limit: 5000000,
        min_withdrawal: 1000,
        daily_checkin_enabled: true,
        live_market_enabled: true
      }
    });
    console.log('Created new settings for Ravenearning!');
  }
}

updateSiteName()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

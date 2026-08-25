import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function updateDbSettings() {
  try {
    const existing = await prisma.settings.findFirst();
    if (existing) {
      const updated = await prisma.settings.update({
        where: { id: existing.id },
        data: {
          quickpay_enabled: true,
          quickpay_merchant: '29fa680428895a245ce880b907047bfe',
          quickpay_key: 'f065020799e18163c90a18b9b2cea99b',
          quickpay_url: 'https://safricaapi.quickn.vip',
          quickpay_channel: '8001',
          telegram_support: 'https://t.me/ravenearning780',
          telegram_group: 'https://t.me/ravenearning780'
        }
      });
      console.log('Database settings updated with live credentials & support link:', updated.id);
    } else {
      console.log('No settings row found in database yet.');
    }
  } catch (e) {
    console.warn('Settings update notice:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateDbSettings();

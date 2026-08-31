import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateTgDb() {
  try {
    let settings = await prisma.settings.findFirst();
    if (settings) {
      await prisma.settings.update({
        where: { id: settings.id },
        data: {
          telegram_support: "https://t.me/ravenearning780",
          telegram_group: "https://t.me/ravenearning780",
          telegram_community: "https://t.me/ravenearning780",
          usdt_bep20_address: "0xC6DD6e8d226bc069Dd6F8745F3D468EA502F9892",
          usdt_trc20_address: "TXmvGTE6PREAYxWarUissgHWMU9f6dhV4V"
        }
      });
      console.log('✅ Updated DB Settings with Telegram support link t.me/ravenearning780!');
    }
  } catch (err) {
    console.error('Error updating DB:', err);
  } finally {
    await prisma.$disconnect();
  }
}

updateTgDb();

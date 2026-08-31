import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function fixDbMerchantCode() {
  try {
    let settings = await prisma.settings.findFirst();
    if (settings) {
      await prisma.settings.update({
        where: { id: settings.id },
        data: {
          quickpay_enabled: true,
          quickpay_merchant: "532b2a3a8df246a791078787be05e10c",
          quickpay_key: "af3407370d3448ecb155a9bfd8e2427a",
          quickpay_url: "https://safricaapi.quickn.vip",
          quickpay_channel: "8001"
        }
      });
      console.log('✅ DB Settings updated successfully with Merchant ID 532b2a3a8df246a791078787be05e10c!');
    }
  } catch (err) {
    console.error('Error updating DB:', err);
  } finally {
    await prisma.$disconnect();
  }
}

fixDbMerchantCode();

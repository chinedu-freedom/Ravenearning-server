import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

dotenv.config();

const prisma = new PrismaClient();

const defaultSettings = {
  site_name: 'Ravenearning',
  site_title: 'Ravenearning Investment Platform',
  currency_name: 'ZAR',
  currency_symbol: 'R',
  timezone: 'Africa/Johannesburg',
  platform_logo: '/logo.png',
  registration_bonus: 100,
  welcome_bonus_destination: 'withdrawable_balance',
  daily_withdrawal_limit: 100000,
  min_withdrawal: 100,
  max_withdrawal: 50000,
  min_deposit: 100,
  max_deposit: 500000,
  withdrawal_charge: 15,
  deposit_charge: 0,
  deposit_bonus: 0,
  quickpay_enabled: true,
  quickpay_merchant: '29fa680428895a245ce880b907047bfe',
  quickpay_key: 'f065020799e18163c90a18b9b2cea99b',
  quickpay_url: 'https://safricaapi.quickn.vip',
  quickpay_channel: '8001',
  level1_commission: 30,
  level2_commission: 10,
  level3_commission: 5,
  level4_commission: 0,
  live_market_enabled: true,
  activity_series_enabled: false,
};

export async function runSeed() {
  console.log('Seeding defaults...');

  // 1. Settings (Only if not created yet)
  const existingSettings = await prisma.settings.findFirst();
  if (!existingSettings) {
    await prisma.settings.create({ data: defaultSettings });
    console.log('Created default platform settings');
  } else {
    console.log('Platform settings already initialized, preserving admin configurations.');
  }

  // 2. Admin Account (Only ensure superadmin exists)
  const adminPassword = await bcrypt.hash('Chinedu2$', 10);
  const existingAdmin = await prisma.admins.findFirst({
    where: {
      OR: [
        { phone: '8158052206' },
        { email: 'admin@omni.com' },
        { username: 'admin' }
      ]
    }
  });

  if (existingAdmin) {
    await prisma.admins.update({
      where: { id: existingAdmin.id },
      data: {
        phone: '8158052206',
        email: 'admin@omni.com',
        password_hash: adminPassword,
        role: 'superadmin',
        username: 'admin'
      }
    });
    console.log('Updated admin account: 8158052206 / Chinedu2$');
  } else {
    await prisma.admins.create({
      data: {
        phone: '8158052206',
        email: 'admin@omni.com',
        password_hash: adminPassword,
        role: 'superadmin',
        username: 'admin'
      }
    });
    console.log('Created admin account: 8158052206 / Chinedu2$');
  }

  console.log('Database initialization completed successfully! Plans are 100% managed by Admin.');
}

if (process.argv[1]?.endsWith('seed.js')) {
  runSeed()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

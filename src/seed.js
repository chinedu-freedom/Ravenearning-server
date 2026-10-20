import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

dotenv.config();

const prisma = new PrismaClient();

const defaultSettings = {
  site_name: 'suncerestcapital',
  site_title: 'suncerestcapital',
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
  quickpay_enabled: false,
  quickpay_merchant: process.env.QUICKPAY_MERCHANT || '',
  quickpay_key: process.env.QUICKPAY_KEY || '',
  quickpay_url: process.env.QUICKPAY_URL || 'https://safricaapi.quickn.vip',
  quickpay_channel: process.env.QUICKPAY_CHANNEL || '8001',
  level1_commission: 30,
  level2_commission: 10,
  level3_commission: 5,
  level4_commission: 0,
  live_market_enabled: true,
  activity_series_enabled: false,
};

export async function runSeed() {
  console.log('Checking database initialization state...');

  // 1. Settings: Only create initial defaults if table is empty. Never overwrite existing settings!
  const existingSettings = await prisma.settings.findFirst();
  if (!existingSettings) {
    await prisma.settings.create({ data: defaultSettings });
    console.log('Created initial platform settings');
  } else {
    console.log('Platform settings already exist. Preserving all admin configurations.');
  }

  // 2. Admin Account: ONLY create an initial superadmin if NO admin exists in the database.
  // NEVER reset, update, or overwrite existing admin credentials on server restart!
  const adminCount = await prisma.admins.count();
  if (adminCount === 0) {
    const initialEmail = process.env.ADMIN_INITIAL_EMAIL || 'admin@suncerestcapital.com';
    const initialPhone = process.env.ADMIN_INITIAL_PHONE || '08158052206';
    const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || 'SuncerestAdmin2026!';
    const initialUsername = process.env.ADMIN_INITIAL_USERNAME || 'admin';
    const passwordHash = await bcrypt.hash(initialPassword, 10);

    await prisma.admins.create({
      data: {
        phone: initialPhone,
        email: initialEmail,
        password_hash: passwordHash,
        role: 'superadmin',
        username: initialUsername
      }
    });
    console.log(`Created initial superadmin account: ${initialEmail} / ${initialPhone}`);
  } else {
    console.log(`Admin accounts already exist (${adminCount} found). Preserving all administrator credentials and passwords.`);
  }

  console.log('Database initialization check complete. Zero data overwritten.');
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

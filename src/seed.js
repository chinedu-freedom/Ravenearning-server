import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding defaults...');

  // 1. Create a Default Country (South Africa)
  const defaultCountry = await prisma.countries.upsert({
    where: { country_code: 'ZA' },
    update: {},
    create: {
      country_code: 'ZA',
      country_name: 'South Africa',
      currency_symbol: 'R',
      currency_code: 'ZAR',
      exchange_rate: 1.0,
      auto_update: false,
      status: true,
    },
  });
  console.log(`Default Country: ${defaultCountry.country_name} (${defaultCountry.id})`);

  // 2. Create a Default Language
  const defaultLanguage = await prisma.languages.upsert({
    where: { language_code: 'en' },
    update: {},
    create: {
      language_code: 'en',
      language_name: 'English',
      native_name: 'English',
      flag_emoji: '🇿🇦',
      text_direction: 'ltr',
      is_default: true,
      status: true,
    },
  });
  console.log(`Default Language: ${defaultLanguage.language_name} (${defaultLanguage.id})`);

  // 3. Create Default Settings
  const existingSettings = await prisma.settings.findFirst();
  if (!existingSettings) {
    const settings = await prisma.settings.create({
      data: {
        site_name: 'Ravenearning',
        site_title: 'Ravenearning Investment Platform',
        currency_name: 'ZAR',
        currency_symbol: 'R',
        timezone: 'Africa/Johannesburg',
        platform_logo: '/logo.jpeg',
        registration_bonus: 0,
        welcome_bonus_destination: 'withdrawable_balance',
        daily_withdrawal_limit: 100000,
        min_withdrawal: 100,
        max_withdrawal: 50000,
        min_deposit: 100,
        max_deposit: 500000,
        withdrawal_charge: 2,
        deposit_charge: 0,
        deposit_bonus: 0,
        level1_commission: 10,
        level2_commission: 5,
        level3_commission: 2,
        level4_commission: 1,
        live_market_enabled: true,
      }
    });
    console.log(`Default Settings created: ${settings.site_name}`);
  }

  // 4. Create a default Admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.admins.upsert({
    where: { email: 'admin@omni.com' },
    update: {},
    create: {
      email: 'admin@omni.com',
      password_hash: adminPassword,
      role: 'superadmin',
    },
  });
  console.log(`Default Admin: ${admin.email} / admin123`);

  console.log('Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

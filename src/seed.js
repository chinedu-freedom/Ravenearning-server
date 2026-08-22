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
  level1_commission: 30,
  level2_commission: 10,
  level3_commission: 5,
  level4_commission: 0,
  live_market_enabled: true,
};

const vipPlans = [
  { name: 'Raven Z6X', min_investment: 300, max_investment: 300, daily_income: 75, duration: 180, image: '/logo.png', status: true },
  { name: 'Raven Z7 Max', min_investment: 700, max_investment: 700, daily_income: 204, duration: 180, image: '/logo.png', status: true },
  { name: 'Raven Z8 Ultra', min_investment: 1500, max_investment: 1500, daily_income: 390, duration: 180, image: '/logo.png', status: true },
  { name: 'Raven H4 Pro', min_investment: 3500, max_investment: 3500, daily_income: 795, duration: 180, image: '/logo.png', status: true },
  { name: 'Raven H8 Max', min_investment: 7000, max_investment: 7000, daily_income: 1620, duration: 180, image: '/logo.png', status: true },
  { name: 'Raven H9 Ultra', min_investment: 15000, max_investment: 15000, daily_income: 3360, duration: 180, image: '/logo.png', status: true },
  { name: 'Raven T7', min_investment: 30000, max_investment: 30000, daily_income: 7500, duration: 180, image: '/logo.png', status: true },
  { name: 'Raven T10 Pro', min_investment: 50000, max_investment: 50000, daily_income: 20000, duration: 180, image: '/logo.png', status: true }
];

export async function runSeed() {
  console.log('Seeding defaults...');

  // 1. Settings
  const existingSettings = await prisma.settings.findFirst();
  if (!existingSettings) {
    await prisma.settings.create({ data: defaultSettings });
    console.log('Created default platform settings');
  } else {
    await prisma.settings.update({
      where: { id: existingSettings.id },
      data: defaultSettings
    });
    console.log('Updated platform settings to Ravenearning defaults');
  }

  // 2. Admin
  const adminPassword = await bcrypt.hash('Chinedu2$', 10);
  const existingAdmin = await prisma.admins.findFirst({
    where: {
      OR: [
        { phone: '278158052206' },
        { email: 'admin@omni.com' },
        { username: 'admin' }
      ]
    }
  });

  if (existingAdmin) {
    await prisma.admins.update({
      where: { id: existingAdmin.id },
      data: {
        phone: '278158052206',
        email: 'admin@omni.com',
        password_hash: adminPassword,
        role: 'superadmin',
        username: 'admin'
      }
    });
    console.log('Updated admin account: 278158052206 / Chinedu2$');
  } else {
    await prisma.admins.create({
      data: {
        phone: '278158052206',
        email: 'admin@omni.com',
        password_hash: adminPassword,
        role: 'superadmin',
        username: 'admin'
      }
    });
    console.log('Created admin account: 278158052206 / Chinedu2$');
  }

  // 3. VIP Investment Plans
  for (const plan of vipPlans) {
    const existingPlan = await prisma.plans.findFirst({
      where: {
        OR: [
          { min_investment: plan.min_investment },
          { name: plan.name }
        ]
      }
    });

    if (existingPlan) {
      await prisma.plans.update({
        where: { id: existingPlan.id },
        data: {
          daily_income: plan.daily_income,
          duration: plan.duration,
          min_investment: plan.min_investment,
          max_investment: plan.max_investment,
          status: true
        }
      });
    } else {
      await prisma.plans.create({
        data: plan
      });
    }
  }
  console.log(`Seeded ${vipPlans.length} VIP investment packages`);

  console.log('Database initialization completed successfully!');
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

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

dotenv.config();

const prisma = new PrismaClient();

const defaultSettings = {
  site_name: 'suncerestcapital',
  site_title: 'suncerestcapital',
  currency_name: 'ETB',
  currency_symbol: 'Br',
  timezone: 'Africa/Addis_Ababa',
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
  level1_commission: 30,
  level2_commission: 10,
  level3_commission: 5,
  level4_commission: 0,
  live_market_enabled: true,
  activity_series_enabled: false,
};

async function clearDatabase() {
  const isHard = process.argv.includes('--hard') || process.argv.includes('--all');
  console.log(`Starting database cleanup (Mode: ${isHard ? 'COMPLETE HARD WIPE' : 'CLEAN USER DATA & RESET SETTINGS'})...`);

  try {
    // 1. Delete user transactions and dependent records in correct foreign key order
    console.log('Clearing user activity, transactions, and logs...');
    await prisma.transactions.deleteMany().catch(() => {});
    await prisma.deposits.deleteMany().catch(() => {});
    await prisma.withdrawals.deleteMany().catch(() => {});
    await prisma.investment_profits.deleteMany().catch(() => {});
    await prisma.investments.deleteMany().catch(() => {});
    await prisma.referral_commissions.deleteMany().catch(() => {});
    await prisma.task_claims.deleteMany().catch(() => {});
    await prisma.user_checkins.deleteMany().catch(() => {});
    await prisma.user_spins.deleteMany().catch(() => {});
    await prisma.spin_logs.deleteMany().catch(() => {});
    await prisma.gift_code_claims.deleteMany().catch(() => {});
    await prisma.password_resets.deleteMany().catch(() => {});

    // 2. Clear users
    console.log('Clearing all user accounts...');
    // Clear referred_by self-relation before deleting users to avoid constraint errors
    await prisma.users.updateMany({ data: { referred_by: null } }).catch(() => {});
    await prisma.users.deleteMany().catch(() => {});

    if (isHard) {
      console.log('Hard mode: Clearing plans, gift codes, and custom settings...');
      await prisma.plans.deleteMany().catch(() => {});
      await prisma.gift_codes.deleteMany().catch(() => {});
      await prisma.settings.deleteMany().catch(() => {});
      await prisma.admins.deleteMany().catch(() => {});

      // Re-seed initial admin and fresh settings
      console.log('Re-initializing Superadmin and Ethiopian settings...');
      await prisma.settings.create({ data: defaultSettings });
      
      const initialEmail = process.env.ADMIN_INITIAL_EMAIL || 'admin@suncerestcapital.com';
      const initialPhone = process.env.ADMIN_INITIAL_PHONE || '08158052206';
      const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || 'suncerestcapital23$';
      const passwordHash = await bcrypt.hash(initialPassword, 10);
      await prisma.admins.create({
        data: {
          phone: initialPhone,
          email: initialEmail,
          password_hash: passwordHash,
          role: 'superadmin',
          username: 'admin'
        }
      });
      console.log(`Created Superadmin: ${initialEmail}`);
    } else {
      // Standard mode: update/reset settings to clean Ethiopian defaults
      console.log('Resetting platform settings to clean Ethiopia configuration (Br / ETB)...');
      const settings = await prisma.settings.findFirst();
      if (settings) {
        await prisma.settings.update({
          where: { id: settings.id },
          data: {
            currency_name: 'ETB',
            currency_symbol: 'Br',
            timezone: 'Africa/Addis_Ababa'
          }
        });
      } else {
        await prisma.settings.create({ data: defaultSettings });
      }

      // Ensure superadmin exists
      const adminCount = await prisma.admins.count();
      if (adminCount === 0) {
        const initialEmail = process.env.ADMIN_INITIAL_EMAIL || 'admin@suncerestcapital.com';
        const initialPhone = process.env.ADMIN_INITIAL_PHONE || '08158052206';
        const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || 'suncerestcapital23$';
        const passwordHash = await bcrypt.hash(initialPassword, 10);
        await prisma.admins.create({
          data: {
            phone: initialPhone,
            email: initialEmail,
            password_hash: passwordHash,
            role: 'superadmin',
            username: 'admin'
          }
        });
        console.log(`Ensured Superadmin exists: ${initialEmail}`);
      }
    }

    console.log('----------------------------------------------------');
    console.log('DATABASE SUCCESSFULLY CLEARED AND RESET FOR ETHIOPIA!');
    console.log('----------------------------------------------------');
  } catch (error) {
    console.error('Error during database cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearDatabase();

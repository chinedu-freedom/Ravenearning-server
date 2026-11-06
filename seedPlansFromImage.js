import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();
const prisma = new PrismaClient();

const officialPlans = [
  {
    name: "Suncerest 1",
    description: "Suncerest 1 Solar Energy Infrastructure",
    category: "VIP Series",
    duration: 30,
    min_investment: 600,
    max_investment: 600,
    daily_income: 90,
    image: "/images/plans/vip1.jpg",
    status: true,
    is_sold_out: false,
    capital_return: false,
    is_fixed_deposit: false
  },
  {
    name: "Suncerest 2",
    description: "Suncerest 2 Solar Energy Infrastructure",
    category: "VIP Series",
    duration: 30,
    min_investment: 1000,
    max_investment: 1000,
    daily_income: 160,
    image: "/images/plans/vip2.jpg",
    status: true,
    is_sold_out: false,
    capital_return: false,
    is_fixed_deposit: false
  },
  {
    name: "Suncerest 3",
    description: "Suncerest 3 Solar Energy Infrastructure",
    category: "VIP Series",
    duration: 60,
    min_investment: 3000,
    max_investment: 3000,
    daily_income: 500,
    image: "/images/plans/vip3.jpg",
    status: true,
    is_sold_out: false,
    capital_return: false,
    is_fixed_deposit: false
  },
  {
    name: "Suncerest 4",
    description: "Suncerest 4 Solar Energy Infrastructure",
    category: "VIP Series",
    duration: 60,
    min_investment: 6000,
    max_investment: 6000,
    daily_income: 1050,
    image: "/images/plans/vip4.jpg",
    status: true,
    is_sold_out: false,
    capital_return: false,
    is_fixed_deposit: false
  },
  {
    name: "Suncerest 5",
    description: "Suncerest 5 Solar Energy Infrastructure",
    category: "VIP Series",
    duration: 60,
    min_investment: 12000,
    max_investment: 12000,
    daily_income: 2200,
    image: "/images/plans/vip5.jpg",
    status: true,
    is_sold_out: false,
    capital_return: false,
    is_fixed_deposit: false
  },
  {
    name: "Suncerest 6",
    description: "Suncerest 6 Solar Energy Infrastructure",
    category: "VIP Series",
    duration: 60,
    min_investment: 25000,
    max_investment: 25000,
    daily_income: 5000,
    image: "/images/plans/vip6.jpg",
    status: true,
    is_sold_out: false,
    capital_return: false,
    is_fixed_deposit: false
  },
  {
    name: "Suncerest 7",
    description: "Suncerest 7 Solar Energy Infrastructure",
    category: "VIP Series",
    duration: 90,
    min_investment: 50000,
    max_investment: 50000,
    daily_income: 10500,
    image: "/images/plans/vip7.jpg",
    status: true,
    is_sold_out: false,
    capital_return: false,
    is_fixed_deposit: false
  },
  {
    name: "Suncerest 8",
    description: "Suncerest 8 Solar Energy Infrastructure",
    category: "VIP Series",
    duration: 90,
    min_investment: 100000,
    max_investment: 100000,
    daily_income: 23000,
    image: "/images/plans/vip8.jpg",
    status: true,
    is_sold_out: false,
    capital_return: false,
    is_fixed_deposit: false
  },
  {
    name: "Suncerest 9",
    description: "Suncerest 9 Solar Energy Infrastructure",
    category: "VIP Series",
    duration: 90,
    min_investment: 200000,
    max_investment: 200000,
    daily_income: 50000,
    image: "/images/plans/vip9.jpg",
    status: true,
    is_sold_out: false,
    capital_return: false,
    is_fixed_deposit: false
  }
];

async function seedPlans() {
  console.log("Seeding Suncerest investment plans from official flyer...");

  // 1. Wipe existing plans to ensure clean order matching official flyer
  await prisma.plans.deleteMany();
  console.log("Cleared existing plans.");

  // 2. Create the 9 official plans
  for (const plan of officialPlans) {
    const created = await prisma.plans.create({ data: plan });
    const totalEarnings = Number(plan.daily_income) * plan.duration;
    console.log(`Created: ${created.name} | Price: ${plan.min_investment} ETB | Daily: ${plan.daily_income} ETB | Total: ${totalEarnings} ETB | Days: ${plan.duration}`);
  }

  // 3. Update settings to match platform flyer details
  console.log("Updating platform settings with flyer values...");
  const existingSettings = await prisma.settings.findFirst();
  const settingsData = {
    currency_name: 'ETB',
    currency_symbol: 'Br',
    timezone: 'Africa/Addis_Ababa',
    registration_bonus: 200,
    min_deposit: 600,
    min_withdrawal: 200,
    withdrawal_charge: 15,
    level1_commission: 22,
    level2_commission: 2,
    level3_commission: 1
  };

  if (existingSettings) {
    await prisma.settings.update({
      where: { id: existingSettings.id },
      data: settingsData
    });
    console.log("Updated existing platform settings.");
  } else {
    await prisma.settings.create({
      data: {
        site_name: 'suncerestcapital',
        site_title: 'suncerestcapital',
        platform_logo: '/logo.png',
        welcome_bonus_destination: 'withdrawable_balance',
        daily_withdrawal_limit: 100000,
        max_withdrawal: 5000000,
        max_deposit: 10000000,
        deposit_charge: 0,
        deposit_bonus: 0,
        quickpay_enabled: false,
        live_market_enabled: true,
        activity_series_enabled: false,
        ...settingsData
      }
    });
    console.log("Created fresh platform settings.");
  }

  // 4. Update daily check-in rewards to ETB 10
  console.log("Setting daily check-in rewards to ETB 10...");
  await prisma.daily_checkins.deleteMany().catch(() => {});
  for (let day = 1; day <= 7; day++) {
    await prisma.daily_checkins.create({
      data: {
        day_number: day,
        reward_amount: 10,
        description: `Day ${day} Check-in Reward (ETB 10)`
      }
    });
  }
  console.log("Daily check-in rewards set to ETB 10 for Days 1-7.");

  console.log("\n==============================================");
  console.log("ALL 9 SUNCEREST INVESTMENT PLANS SUCCESSFULLY CREATED!");
  console.log("==============================================");
}

seedPlans()
  .catch((e) => {
    console.error("Error executing seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

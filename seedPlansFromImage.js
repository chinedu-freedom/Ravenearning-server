import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();
const prisma = new PrismaClient();

const officialPlans = [
  {
    vip: "VIP1",
    name: "Suncerest Capital 1",
    description: "Suncerest Capital 1 Solar Energy Infrastructure",
    category: "VIP Series",
    duration: 360,
    min_investment: 200,
    max_investment: 200,
    daily_income: 40,
    total_revenue: 14000,
    image: "/images/plans/vip1.jpg",
    status: true,
    is_sold_out: false,
    capital_return: false,
    is_fixed_deposit: false
  },
  {
    vip: "VIP2",
    name: "Suncerest Capital 2",
    description: "Suncerest Capital 2 Solar Energy Infrastructure",
    category: "VIP Series",
    duration: 360,
    min_investment: 500,
    max_investment: 500,
    daily_income: 90,
    total_revenue: 32400,
    image: "/images/plans/vip2.jpg",
    status: true,
    is_sold_out: false,
    capital_return: false,
    is_fixed_deposit: false
  },
  {
    vip: "VIP3",
    name: "Suncerest Capital 3",
    description: "Suncerest Capital 3 Solar Energy Infrastructure",
    category: "VIP Series",
    duration: 360,
    min_investment: 1000,
    max_investment: 1000,
    daily_income: 310,
    total_revenue: 111600,
    image: "/images/plans/vip3.jpg",
    status: true,
    is_sold_out: false,
    capital_return: false,
    is_fixed_deposit: false
  },
  {
    vip: "VIP4",
    name: "Suncerest Capital 4",
    description: "Suncerest Capital 4 Solar Energy Infrastructure",
    category: "VIP Series",
    duration: 360,
    min_investment: 2000,
    max_investment: 2000,
    daily_income: 640,
    total_revenue: 230400,
    image: "/images/plans/vip4.jpg",
    status: true,
    is_sold_out: false,
    capital_return: false,
    is_fixed_deposit: false
  },
  {
    vip: "VIP5",
    name: "Suncerest Capital 5",
    description: "Suncerest Capital 5 Solar Energy Infrastructure",
    category: "VIP Series",
    duration: 360,
    min_investment: 4000,
    max_investment: 4000,
    daily_income: 1320,
    total_revenue: 475200,
    image: "/images/plans/vip5.jpg",
    status: true,
    is_sold_out: false,
    capital_return: false,
    is_fixed_deposit: false
  },
  {
    vip: "VIP6",
    name: "Suncerest Capital 6",
    description: "Suncerest Capital 6 Solar Energy Infrastructure",
    category: "VIP Series",
    duration: 360,
    min_investment: 10000,
    max_investment: 10000,
    daily_income: 3400,
    total_revenue: 1224000,
    image: "/images/plans/vip6.jpg",
    status: true,
    is_sold_out: false,
    capital_return: false,
    is_fixed_deposit: false
  },
  {
    vip: "VIP7",
    name: "Suncerest Capital 7",
    description: "Suncerest Capital 7 Solar Energy Infrastructure",
    category: "VIP Series",
    duration: 360,
    min_investment: 20000,
    max_investment: 20000,
    daily_income: 7000,
    total_revenue: 2520000,
    image: "/images/plans/vip7.jpg",
    status: true,
    is_sold_out: false,
    capital_return: false,
    is_fixed_deposit: false
  },
  {
    vip: "VIP8",
    name: "Suncerest Capital 8",
    description: "Suncerest Capital 8 Solar Energy Infrastructure",
    category: "VIP Series",
    duration: 360,
    min_investment: 30000,
    max_investment: 30000,
    daily_income: 10800,
    total_revenue: 3888000,
    image: "/images/plans/vip8.jpg",
    status: true,
    is_sold_out: false,
    capital_return: false,
    is_fixed_deposit: false
  }
];

async function seedPlans() {
  console.log("Fetching all current plans from database...");
  const allCurrentPlans = await prisma.plans.findMany();
  
  // Separate VIP series from activity/other series
  const existingVipPlans = allCurrentPlans
    .filter(p => !p.category || p.category === 'VIP Series' || p.category.includes('VIP'))
    .sort((a, b) => Number(a.min_investment) - Number(b.min_investment));

  console.log(`Found ${existingVipPlans.length} existing VIP plans and ${allCurrentPlans.length - existingVipPlans.length} other plans.`);

  for (let i = 0; i < officialPlans.length; i++) {
    const target = officialPlans[i];
    const existing = existingVipPlans[i];

    const { total_revenue, vip, ...cleanData } = target;

    if (existing) {
      console.log(`Updating VIP${i + 1}: ${existing.name} -> ${target.name} (Price: R${target.min_investment}, Daily: R${target.daily_income})`);
      await prisma.plans.update({
        where: { id: existing.id },
        data: cleanData
      });
    } else {
      console.log(`Creating new VIP${i + 1}: ${target.name}`);
      await prisma.plans.create({
        data: cleanData
      });
    }
  }

  // Deactivate non-VIP or legacy extra plans
  for (const p of allCurrentPlans) {
    const isVipPlan = existingVipPlans.slice(0, 8).some(v => v.id === p.id);
    if (!isVipPlan) {
      console.log(`Deactivating non-VIP or legacy plan: ${p.name} (ID: ${p.id})`);
      await prisma.plans.update({
        where: { id: p.id },
        data: { status: false }
      });
    }
  }

  console.log("\n--- SUNCEREST CAPITAL PLANS IN DATABASE ---");
  const finalPlans = await prisma.plans.findMany({
    where: { status: true },
    orderBy: { min_investment: 'asc' }
  });

  finalPlans.forEach((p, idx) => {
    console.log(`VIP${idx + 1}: ${p.name} | Price: R ${Number(p.min_investment)} | Daily: R ${Number(p.daily_income)} | Total: R ${Number(p.total_revenue)} | Duration: ${p.duration} days`);
  });
  console.log("------------------------------------------");
}

seedPlans()
  .catch((e) => {
    console.error("Error executing seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

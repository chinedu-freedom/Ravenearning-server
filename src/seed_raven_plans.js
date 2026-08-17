import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ravenPlans = [
  {
    name: "Raven Z6X",
    description: "VIP1 Smart Home Theater Projector",
    duration: 180,
    daily_income: 25.0, // 75 ZAR per day (25% of 300)
    min_investment: 300,
    max_investment: 300,
    is_fixed_deposit: false,
    capital_return: false,
    status: true,
    image: "https://images.unsplash.com/photo-1592478411213-6153e4ebc07d?auto=format&fit=crop&w=600&q=80"
  },
  {
    name: "Raven Z6X Pro",
    description: "VIP2 High Definition Smart Projector",
    duration: 180,
    daily_income: 25.5, // 204 ZAR per day (25.5% of 800)
    min_investment: 800,
    max_investment: 800,
    is_fixed_deposit: false,
    capital_return: false,
    status: true,
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80"
  },
  {
    name: "Raven H6 Max",
    description: "VIP3 4K Ultra HD Cinema Projector",
    duration: 180,
    daily_income: 26.0, // 390 ZAR per day (26% of 1500)
    min_investment: 1500,
    max_investment: 1500,
    is_fixed_deposit: false,
    capital_return: false,
    status: true,
    image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80"
  },
  {
    name: "Raven RS 20",
    description: "VIP4 Dual Light Laser Cinema Projector",
    duration: 180,
    daily_income: 26.5, // 795 ZAR per day (26.5% of 3000)
    min_investment: 3000,
    max_investment: 3000,
    is_fixed_deposit: false,
    capital_return: false,
    status: true,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80"
  },
  {
    name: "Raven Z7X",
    description: "VIP5 Ultra Slim High Brightness Projector",
    duration: 180,
    daily_income: 27.0, // 1620 ZAR per day (27% of 6000)
    min_investment: 6000,
    max_investment: 6000,
    is_fixed_deposit: false,
    capital_return: false,
    status: true,
    image: "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=600&q=80"
  },
  {
    name: "Raven Z9X",
    description: "VIP6 Flagship Laser Optical Engine Projector",
    duration: 180,
    daily_income: 28.0, // 3360 ZAR per day (28% of 12000)
    min_investment: 12000,
    max_investment: 12000,
    is_fixed_deposit: false,
    capital_return: false,
    status: true,
    image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=600&q=80"
  },
  {
    name: "Raven M1 Pro",
    description: "VIP7 Master Gimbal Laser Studio Projector",
    duration: 180,
    daily_income: 30.0, // 7500 ZAR per day (30% of 25000)
    min_investment: 25000,
    max_investment: 25000,
    is_fixed_deposit: false,
    capital_return: false,
    status: true,
    image: "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?auto=format&fit=crop&w=600&q=80"
  },
  {
    name: "Raven T10 Pro",
    description: "VIP8 Commercial Laser Cinema System",
    duration: 180,
    daily_income: 40.0, // 20000 ZAR per day (40% of 50000)
    min_investment: 50000,
    max_investment: 50000,
    is_fixed_deposit: false,
    capital_return: false,
    status: true,
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80"
  }
];

async function main() {
  console.log("Seeding Raven VIP Investment Plans...");

  // Update existing or insert new plans
  for (const plan of ravenPlans) {
    const existing = await prisma.plans.findFirst({
      where: { name: plan.name }
    });

    if (existing) {
      await prisma.plans.update({
        where: { id: existing.id },
        data: plan
      });
      console.log(`Updated: ${plan.name} (R${plan.min_investment})`);
    } else {
      await prisma.plans.create({
        data: plan
      });
      console.log(`Created: ${plan.name} (R${plan.min_investment})`);
    }
  }

  // Deactivate or clean old non-Raven plans if any without investments
  const allPlans = await prisma.plans.findMany();
  for (const p of allPlans) {
    if (!p.name.startsWith("Raven ")) {
      try {
        await prisma.plans.delete({ where: { id: p.id } });
        console.log(`Deleted obsolete plan: ${p.name}`);
      } catch (err) {
        await prisma.plans.update({
          where: { id: p.id },
          data: { status: false }
        });
        console.log(`Deactivated obsolete plan: ${p.name}`);
      }
    }
  }

  console.log("Raven VIP plans seeded successfully!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

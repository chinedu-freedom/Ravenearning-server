import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Omni VR plans into database...");

  // Remove old sample plans if any
  await prisma.plans.deleteMany({});

  const samplePlans = [
    {
      name: "VIP1 Omni One VR",
      min_investment: 3000,
      max_investment: 3000,
      daily_income: 25.0, // ₦750 per day
      duration: 180,
      image: "https://images.unsplash.com/photo-1592478411213-6153e4ebc07d?auto=format&fit=crop&w=600&q=80",
      description: "VIP1 Omni One VR Treadmill Investment Package"
    },
    {
      name: "VIP2 Omni One VR",
      min_investment: 7000,
      max_investment: 7000,
      daily_income: 25.5, // ₦1,785 per day
      duration: 180,
      image: "https://images.unsplash.com/photo-1592478411213-6153e4ebc07d?auto=format&fit=crop&w=600&q=80",
      description: "VIP2 Omni One VR Treadmill Investment Package"
    },
    {
      name: "VIP3 Omni One VR",
      min_investment: 20000,
      max_investment: 20000,
      daily_income: 26.0, // ₦5,200 per day
      duration: 180,
      image: "https://images.unsplash.com/photo-1592478411213-6153e4ebc07d?auto=format&fit=crop&w=600&q=80",
      description: "VIP3 Omni One VR Treadmill Investment Package"
    },
    {
      name: "VIP4 Omni One VR",
      min_investment: 50000,
      max_investment: 50000,
      daily_income: 27.0, // ₦13,500 per day
      duration: 180,
      image: "https://images.unsplash.com/photo-1592478411213-6153e4ebc07d?auto=format&fit=crop&w=600&q=80",
      description: "VIP4 Omni One VR Treadmill Investment Package"
    }
  ];

  for (const p of samplePlans) {
    await prisma.plans.create({ data: p });
  }

  console.log("Successfully seeded 4 Omni VR plans!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

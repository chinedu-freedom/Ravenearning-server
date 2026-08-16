import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function updateCurrencyToZAR() {
  const settings = await prisma.settings.findFirst();
  console.log('Current Platform Settings:', settings);

  // Update platform settings to South African Rand (R / ZAR)
  if (settings) {
    const updated = await prisma.settings.update({
      where: { id: settings.id },
      data: {
        currency_symbol: "R",
        currency_name: "ZAR"
      }
    });
    console.log('Platform settings updated successfully to South African Rand (R / ZAR):', updated);
  } else {
    const created = await prisma.settings.create({
      data: {
        site_name: "GREATLAND",
        currency_symbol: "R",
        currency_name: "ZAR"
      }
    });
    console.log('Platform settings created with South African Rand (R / ZAR):', created);
  }
}

updateCurrencyToZAR()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function verifyAddresses() {
  console.log('=== Checking Code Fallbacks in omni deposit/page.jsx ===');
  const pageFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni\\src\\app\\dashboard\\wallet\\deposit\\page.jsx';
  const pageContent = fs.readFileSync(pageFile, 'utf8');
  
  const match = pageContent.match(/const activeUsdtAddress[\s\S]*?;/);
  console.log(match ? match[0] : 'Not found');

  console.log('\n=== Checking Database Settings Record ===');
  const settings = await prisma.settings.findFirst();
  console.log('DB usdt_bep20_address:', settings?.usdt_bep20_address);
  console.log('DB usdt_trc20_address:', settings?.usdt_trc20_address);

  await prisma.$disconnect();
}

verifyAddresses();

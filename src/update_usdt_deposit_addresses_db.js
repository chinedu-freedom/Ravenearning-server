import { PrismaClient } from '@prisma/client';
import fs from 'fs';

// 1. Update omni/src/app/dashboard/wallet/deposit/page.jsx
const depositFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni\\src\\app\\dashboard\\wallet\\deposit\\page.jsx';
let depositContent = fs.readFileSync(depositFile, 'utf8');

depositContent = depositContent.replace(
  /const activeUsdtAddress = usdtNetwork === "BEP20"\s*\?\s*\(settings\.usdt_bep20_address \|\| ".*?"\)\s*:\s*\(settings\.usdt_trc20_address \|\| ".*?"\);/,
  'const activeUsdtAddress = usdtNetwork === "BEP20"\n    ? (settings.usdt_bep20_address || "0xC6DD6e8d226bc069Dd6F8745F3D468EA502F9892")\n    : (settings.usdt_trc20_address || "TXmvGTE6PREAYxWarUissgHWMU9f6dhV4V");'
);

fs.writeFileSync(depositFile, depositContent, 'utf8');
console.log('Successfully updated USDT deposit addresses in omni deposit/page.jsx!');

// 2. Update DB settings table
const prisma = new PrismaClient();

async function updateDbSettings() {
  try {
    let settings = await prisma.settings.findFirst();
    if (settings) {
      await prisma.settings.update({
        where: { id: settings.id },
        data: {
          usdt_bep20_address: "0xC6DD6e8d226bc069Dd6F8745F3D468EA502F9892",
          usdt_trc20_address: "TXmvGTE6PREAYxWarUissgHWMU9f6dhV4V"
        }
      });
      console.log('Successfully updated DB settings with BEP20 and TRC20 addresses!');
    }
  } catch (err) {
    console.error('Error updating DB settings:', err);
  } finally {
    await prisma.$disconnect();
  }
}

updateDbSettings();

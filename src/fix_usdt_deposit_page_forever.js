import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const bep20Addr = "0xC6DD6e8d226bc069Dd6F8745F3D468EA502F9892";
const trc20Addr = "TXmvGTE6PREAYxWarUissgHWMU9f6dhV4V";

// 1. Hard-fix omni/src/app/dashboard/wallet/deposit/page.jsx
const depositFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni\\src\\app\\dashboard\\wallet\\deposit\\page.jsx';
let content = fs.readFileSync(depositFile, 'utf8');

// Replace any occurrence of old fallback or activeUsdtAddress
content = content.replaceAll('0x71C7656EC7ab88b098defB751B7401B5f6d8976F', bep20Addr);
content = content.replaceAll('TYD8x9kL4mN2pQ3vR5sT7uW1xY8zA9bC3d', trc20Addr);

content = content.replace(
  /const activeUsdtAddress = usdtNetwork === "BEP20"[\s\S]*?;/,
  `const activeUsdtAddress = usdtNetwork === "BEP20"\n    ? (settings.usdt_bep20_address || "${bep20Addr}")\n    : (settings.usdt_trc20_address || "${trc20Addr}");`
);

fs.writeFileSync(depositFile, content, 'utf8');
console.log('✅ Hard-fixed omni/src/app/dashboard/wallet/deposit/page.jsx with exact BEP20 & TRC20 addresses!');

// 2. Hard-update DB Settings record in PostgreSQL
const prisma = new PrismaClient();

async function forceUpdateDb() {
  try {
    let settings = await prisma.settings.findFirst();
    if (settings) {
      await prisma.settings.update({
        where: { id: settings.id },
        data: {
          usdt_bep20_address: bep20Addr,
          usdt_trc20_address: trc20Addr,
          telegram_group: "https://t.me/+zem_hTJCVY4yY2E0",
          telegram_community: "https://t.me/+zem_hTJCVY4yY2E0",
          telegram_support: "https://t.me/ravenearning780"
        }
      });
      console.log('✅ DB Settings table updated in PostgreSQL!');
    }
  } catch (err) {
    console.error('Error updating DB:', err);
  } finally {
    await prisma.$disconnect();
  }
}

forceUpdateDb();

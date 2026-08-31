import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const bep20Addr = "0xC6DD6e8d226bc069Dd6F8745F3D468EA502F9892";
const trc20Addr = "TXmvGTE6PREAYxWarUissgHWMU9f6dhV4V";

const oldMockPatterns = [
  "0xC6DD6e8d226bc069Dd6F8745F3D468EA502F9892",
  "TXmvGTE6PREAYxWarUissgHWMU9f6dhV4V",
  "0x1234567890abcdef1234567890abcdef12345678",
  "TXYZ1234567890abcdef1234567890abcdef"
];

function replaceInDir(dirPath) {
  const files = fs.readdirSync(dirPath);
  for (const f of files) {
    const fullPath = path.join(dirPath, f);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!f.includes('node_modules') && !f.includes('.next') && !f.includes('.git')) {
        replaceInDir(fullPath);
      }
    } else if (f.endsWith('.js') || f.endsWith('.jsx') || f.endsWith('.json') || f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.prisma')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      // Replace any old BEP20 mock pattern
      if (content.includes('0xC6DD6e8d226bc069Dd6F8745F3D468EA502F9892')) {
        content = content.replaceAll('0xC6DD6e8d226bc069Dd6F8745F3D468EA502F9892', bep20Addr);
        modified = true;
      }
      // Replace any old TRC20 mock pattern
      if (content.includes('TXmvGTE6PREAYxWarUissgHWMU9f6dhV4V')) {
        content = content.replaceAll('TXmvGTE6PREAYxWarUissgHWMU9f6dhV4V', trc20Addr);
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`✅ Replaced mock wallet in: ${fullPath}`);
      }
    }
  }
}

console.log('=== PURGING MOCK WALLETS ACROSS ALL REPOSITORIES ===');
replaceInDir('C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni\\src');
replaceInDir('C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-admin\\src');
replaceInDir('C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src');

// Update DB Settings & Users table
const prisma = new PrismaClient();

async function updateDbWallets() {
  try {
    let settings = await prisma.settings.findFirst();
    if (settings) {
      await prisma.settings.update({
        where: { id: settings.id },
        data: {
          usdt_bep20_address: bep20Addr,
          usdt_trc20_address: trc20Addr
        }
      });
      console.log('✅ DB Settings table updated with BEP20 & TRC20 addresses!');
    }

    // Update payout_cryptocurrencies if present
    try {
      await prisma.payout_cryptocurrencies.updateMany({
        where: { code: 'USDT_BEP20' },
        data: { wallet_address: bep20Addr }
      });
      await prisma.payout_cryptocurrencies.updateMany({
        where: { code: 'USDT_TRC20' },
        data: { wallet_address: trc20Addr }
      });
      console.log('✅ DB Payout Cryptocurrencies updated!');
    } catch (e) {
      // Ignore if table/fields differ
    }

  } catch (err) {
    console.error('Error updating DB:', err);
  } finally {
    await prisma.$disconnect();
  }
}

updateDbWallets();

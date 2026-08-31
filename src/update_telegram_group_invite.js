import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const tgGroupLink = "https://t.me/+zem_hTJCVY4yY2E0";
const tgSupportLink = "https://t.me/ravenearning780";

// 1. Update omni/src/app/dashboard/account/page.jsx
const accountFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni\\src\\app\\dashboard\\account\\page.jsx';
let accountContent = fs.readFileSync(accountFile, 'utf8');

// Replace Telegram Group href
accountContent = accountContent.replace(
  /\{\/\* Telegram Group \*\/\}\s*<a\s+href=".*?"/g,
  `{/* Telegram Group */}\n          <a\n            href="${tgGroupLink}"`
);

// Replace Telegram Support href
accountContent = accountContent.replace(
  /\{\/\* Telegram Support \*\/\}\s*<a\s+href=".*?"/g,
  `{/* Telegram Support */}\n          <a\n            href="${tgSupportLink}"`
);

fs.writeFileSync(accountFile, accountContent, 'utf8');
console.log('✅ Updated omni/src/app/dashboard/account/page.jsx with Telegram Group link:', tgGroupLink);

// 2. Update omni/src/app/dashboard/page.jsx
const dashFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni\\src\\app\\dashboard\\page.jsx';
let dashContent = fs.readFileSync(dashFile, 'utf8');

dashContent = dashContent.replace(
  /action: \(\) => window\.open\(settings\?\.telegram_group \|\| settings\?\.telegram_channel \|\| settings\?\.telegram_link \|\| ".*?", "_blank"\)/g,
  `action: () => window.open(settings?.telegram_group || settings?.telegram_link || "${tgGroupLink}", "_blank")`
);

dashContent = dashContent.replace(
  /action: \(\) => window\.open\(settings\?\.telegram_support \|\| settings\?\.telegram_channel \|\| settings\?\.telegram_link \|\| ".*?", "_blank"\)/g,
  `action: () => window.open(settings?.telegram_support || settings?.telegram_link || "${tgSupportLink}", "_blank")`
);

fs.writeFileSync(dashFile, dashContent, 'utf8');
console.log('✅ Updated omni/src/app/dashboard/page.jsx with Telegram Group link!');

// 3. Update DB settings record
const prisma = new PrismaClient();

async function updateDbSettings() {
  try {
    let settings = await prisma.settings.findFirst();
    if (settings) {
      await prisma.settings.update({
        where: { id: settings.id },
        data: {
          telegram_group: tgGroupLink,
          telegram_community: tgGroupLink,
          telegram_support: tgSupportLink
        }
      });
      console.log('✅ Updated DB Settings table with Telegram Group link:', tgGroupLink);
    }
  } catch (err) {
    console.error('Error updating DB:', err);
  } finally {
    await prisma.$disconnect();
  }
}

updateDbSettings();

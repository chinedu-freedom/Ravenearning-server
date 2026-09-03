import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectPhoneUserAndAuth() {
  console.log('====================================================');
  console.log('🔍 INSPECTING USER 0764445453 IN DATABASE & AUTH ROUTES');
  console.log('====================================================\n');

  // 1. Search for user with phone 0764445453 or variants
  const phoneVariants = ['0764445453', '764445453', '27764445453', '+27764445453'];
  const users = await prisma.users.findMany({
    where: {
      OR: [
        { phone: { in: phoneVariants } },
        { username: { in: phoneVariants } },
        { phone: { contains: '764445453' } }
      ]
    }
  });

  console.log(`Found ${users.length} matching users in DB:`);
  users.forEach(u => {
    console.log(`- ID: ${u.id}`);
    console.log(`  Phone: "${u.phone}"`);
    console.log(`  Username: "${u.username}"`);
    console.log(`  Email: "${u.email}"`);
    console.log(`  Password Hash Prefix: "${u.password ? u.password.substring(0, 15) : 'NONE'}"`);
    console.log(`  Is Active: ${u.is_active}`);
  });

  // 2. Read auth.js routes
  const authFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\auth.js';
  if (fs.existsSync(authFile)) {
    const authContent = fs.readFileSync(authFile, 'utf8');
    console.log('\n--- auth.js login & reset handlers ---');
    const lines = authContent.split('\n');
    lines.forEach((l, idx) => {
      if (l.includes('login') || l.includes('reset') || l.includes('cleanPhoneNumber') || l.includes('phone')) {
        if (idx < 200) {
          console.log(`${idx + 1}: ${l}`);
        }
      }
    });
  }

  await prisma.$disconnect();
}

inspectPhoneUserAndAuth();

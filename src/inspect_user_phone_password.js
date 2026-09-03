import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectUser() {
  console.log('====================================================');
  console.log('🔍 SEARCHING DATABASE FOR PHONE: 0764445453 / 764445453 / 27764445453');
  console.log('====================================================\n');

  const users = await prisma.users.findMany({
    where: {
      OR: [
        { phone: { contains: '764445453' } },
        { username: { contains: '764445453' } },
        { email: { contains: '764445453' } }
      ]
    }
  });

  console.log(`Found ${users.length} matching user(s):`);
  users.forEach(u => {
    console.log(`- ID: ${u.id}`);
    console.log(`  Phone: "${u.phone}"`);
    console.log(`  Username: "${u.username}"`);
    console.log(`  Email: "${u.email}"`);
    console.log(`  Is Active: ${u.is_active}`);
    console.log(`  Password Hash (first 20 chars): ${u.password ? u.password.substring(0, 20) : 'null'}`);
    console.log(`  Withdrawal PIN Hash: ${u.withdrawal_pin ? u.withdrawal_pin.substring(0, 20) : 'null'}\n`);
  });

  await prisma.$disconnect();
}

inspectUser();

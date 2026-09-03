import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listUsers() {
  console.log('====================================================');
  console.log('📋 ALL USERS IN DATABASE:');
  console.log('====================================================\n');

  const users = await prisma.users.findMany({
    take: 30,
    orderBy: { created_at: 'desc' }
  });

  console.log(`Total users found: ${users.length}\n`);
  users.forEach((u, i) => {
    console.log(`${i + 1}. ID: ${u.id}`);
    console.log(`   Phone: "${u.phone}"`);
    console.log(`   Username: "${u.username}"`);
    console.log(`   Email: "${u.email}"`);
    console.log(`   Full Name: "${u.full_name}"`);
    console.log(`   Created At: ${u.created_at}\n`);
  });

  await prisma.$disconnect();
}

listUsers();

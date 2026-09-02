import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillNullTrackIds() {
  console.log('====================================================');
  console.log('⚡ BACK-FILLING NULL TRACK_IDs IN DATABASE');
  console.log('====================================================\n');

  const nullDeposits = await prisma.deposits.findMany({
    where: { track_id: null }
  });

  console.log(`Found ${nullDeposits.length} deposits with null track_id.`);

  for (const dep of nullDeposits) {
    const cleanPrefix = dep.id.replace(/-/g, '').substring(0, 8);
    const timeMs = new Date(dep.created_at).getTime();
    const newTrackId = `DEP-${cleanPrefix}-${timeMs}`;

    await prisma.deposits.update({
      where: { id: dep.id },
      data: { track_id: newTrackId }
    });

    console.log(`✅ Set Deposit ${dep.id} -> track_id: ${newTrackId}`);
  }

  await prisma.$disconnect();
  console.log('\n🎉 ALL NULL TRACK_IDs IN DATABASE ARE NOW BACK-FILLED!');
}

backfillNullTrackIds();

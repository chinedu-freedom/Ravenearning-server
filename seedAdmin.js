import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const email = args[0];
  const password = args[1];
  const phone = args[2];
  const role = args[3] || 'superadmin';

  if (!email || !password) {
    console.error('Error: Email and password must be explicitly provided.');
    console.error('Usage: node seedAdmin.js <email> <password> [phone] [role]');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('Error: Password must be at least 6 characters long.');
    process.exit(1);
  }

  console.log(`Creating/updating admin with:`);
  console.log(`- Email: ${email}`);
  console.log(`- Role: ${role}`);

  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.admins.findFirst({
    where: {
      OR: [
        { email },
        phone ? { phone } : undefined
      ].filter(Boolean)
    }
  });

  if (existing) {
    const updated = await prisma.admins.update({
      where: { id: existing.id },
      data: {
        email,
        password_hash: passwordHash,
        role,
        ...(phone ? { phone } : {})
      }
    });
    console.log(`Admin ${updated.email} updated successfully.`);
  } else {
    const created = await prisma.admins.create({
      data: {
        email,
        password_hash: passwordHash,
        role,
        phone: phone || null,
        username: email.split('@')[0]
      }
    });
    console.log(`Admin ${created.email} created successfully.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

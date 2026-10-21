import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

dotenv.config();
const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  
  // Use arguments if provided, otherwise fall back to .env configuration
  const email = args[0] || process.env.ADMIN_INITIAL_EMAIL || 'admin@suncerestcapital.com';
  const password = args[1] || process.env.ADMIN_INITIAL_PASSWORD || 'suncerestcapital23$';
  const phone = args[2] || process.env.ADMIN_INITIAL_PHONE || '08158052206';
  const role = args[3] || 'superadmin';

  if (!email || !password) {
    console.error('Error: Email and password must be provided or configured in .env');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('Error: Password must be at least 6 characters long.');
    process.exit(1);
  }

  // Normalize phone for searching across possible formats (8158052206, 08158052206, 278158052206)
  const rawDigits = phone ? phone.replace(/[^0-9]/g, '') : '';
  const noZero = rawDigits.startsWith('0') ? rawDigits.substring(1) : rawDigits;
  const with27 = noZero.startsWith('27') ? noZero : (noZero.length > 0 ? `27${noZero}` : '');
  const without27 = with27.startsWith('27') ? with27.substring(2) : with27;
  const withZero = noZero.length > 0 ? `0${noZero}` : '';

  const passwordHash = await bcrypt.hash(password, 10);

  // Find existing admin by email, phone variants, or fallback to the single existing admin
  let existing = await prisma.admins.findFirst({
    where: {
      OR: [
        { email },
        phone ? { phone } : undefined,
        withZero ? { phone: withZero } : undefined,
        without27 ? { phone: without27 } : undefined,
        with27 ? { phone: with27 } : undefined,
      ].filter(Boolean)
    }
  });

  if (!existing) {
    const adminCount = await prisma.admins.count();
    if (adminCount === 1) {
      existing = await prisma.admins.findFirst();
    }
  }

  if (existing) {
    const updated = await prisma.admins.update({
      where: { id: existing.id },
      data: {
        email,
        password_hash: passwordHash,
        role,
        phone: without27 || phone || '8158052206',
        username: email.split('@')[0]
      }
    });
    console.log(`\n========================================`);
    console.log(`Admin credentials updated successfully!`);
    console.log(`========================================`);
    console.log(`Login URL: https://admin.suncerestcapital.com`);
    console.log(`Phone:     ${updated.phone} (or 0${updated.phone})`);
    console.log(`Email:     ${updated.email}`);
    console.log(`Password:  ${password}`);
    console.log(`Role:      ${updated.role}`);
    console.log(`========================================\n`);
  } else {
    const created = await prisma.admins.create({
      data: {
        email,
        password_hash: passwordHash,
        role,
        phone: without27 || phone || '8158052206',
        username: email.split('@')[0]
      }
    });
    console.log(`\n========================================`);
    console.log(`Admin account created successfully!`);
    console.log(`========================================`);
    console.log(`Login URL: https://admin.suncerestcapital.com`);
    console.log(`Phone:     ${created.phone} (or 0${created.phone})`);
    console.log(`Email:     ${created.email}`);
    console.log(`Password:  ${password}`);
    console.log(`Role:      ${created.role}`);
    console.log(`========================================\n`);
  }
}

main()
  .catch((e) => {
    console.error('Error in seedAdmin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

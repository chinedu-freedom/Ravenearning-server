import fs from 'fs';

// 1. Update routes/auth.js for flexible phone matching and dual password_hash / password verification
const authFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\auth.js';
let authContent = fs.readFileSync(authFile, 'utf8');

const oldLoginBlock = `  const digits = phoneNum ? phoneNum.replace(/[^0-9]/g, '') : '';
  const noZero = digits.startsWith('0') ? digits.substring(1) : digits;
  const with27 = noZero.startsWith('27') ? noZero : \`27\${noZero}\`;
  const without27 = with27.startsWith('27') ? with27.substring(2) : with27;

  try {
    const user = await prisma.users.findFirst({
      where: {
        OR: [
          { phone: with27 },
          { phone: without27 },
          { phone: digits },
          { username: with27 },
          { username: without27 },
          { email: \`\${with27}@omni.com\` },
          { email: \`\${without27}@omni.com\` },
          { email: \`\${digits}@omni.com\` },
          { email: phoneNum }
        ].filter(Boolean)
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid phone number or password' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);`;

const newLoginBlock = `  const digits = phoneNum ? phoneNum.replace(/[^0-9]/g, '') : '';
  const noZero = digits.startsWith('0') ? digits.substring(1) : digits;
  const with27 = noZero.startsWith('27') ? noZero : \`27\${noZero}\`;
  const without27 = with27.startsWith('27') ? with27.substring(2) : with27;
  const withZero = \`0\${without27}\`;

  try {
    const user = await prisma.users.findFirst({
      where: {
        OR: [
          { phone: with27 },
          { phone: without27 },
          { phone: withZero },
          { phone: digits },
          { phone: phoneNum },
          { username: with27 },
          { username: without27 },
          { username: withZero },
          { username: digits },
          { username: phoneNum },
          { email: \`\${with27}@omni.com\` },
          { email: \`\${without27}@omni.com\` },
          { email: \`\${withZero}@omni.com\` },
          { email: \`\${digits}@omni.com\` },
          { email: phoneNum }
        ].filter(Boolean)
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid phone number or password' });
    }

    let isValid = false;
    if (user.password_hash) {
      isValid = await bcrypt.compare(password, user.password_hash);
    }
    if (!isValid && user.password) {
      isValid = await bcrypt.compare(password, user.password);
    }`;

authContent = authContent.replace(oldLoginBlock, newLoginBlock);

// Also sync both password_hash and password in reset-password route
authContent = authContent.replace(
  /data:\s*\{\s*password_hash\s*\}/g,
  'data: { password_hash, password: password_hash }'
);

fs.writeFileSync(authFile, authContent, 'utf8');
console.log('✅ Updated routes/auth.js with 100% flexible phone matching & dual password verification!');

// 2. Update routes/admin/users.js to sync both password_hash and password when Admin updates a user
const adminUsersFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\admin\\users.js';
let adminUsersContent = fs.readFileSync(adminUsersFile, 'utf8');

adminUsersContent = adminUsersContent.replace(
  /data\.password_hash = await bcrypt\.hash\(plainPassword\.trim\(\), 10\);/g,
  'const hashedPass = await bcrypt.hash(plainPassword.trim(), 10);\n    data.password_hash = hashedPass;\n    data.password = hashedPass;'
);

fs.writeFileSync(adminUsersFile, adminUsersContent, 'utf8');
console.log('✅ Updated routes/admin/users.js to sync password and password_hash during Admin user updates!');

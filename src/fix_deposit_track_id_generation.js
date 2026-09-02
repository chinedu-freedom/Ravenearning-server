import fs from 'fs';

// 1. Update omni-backend/src/routes/user.js to generate track_id immediately on deposits.create
const userFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\user.js';
let userContent = fs.readFileSync(userFile, 'utf8');

// Ensure track_id is set at initial deposit creation
userContent = userContent.replace(
  /const deposit = await prisma\.deposits\.create\(\{\s*data:\s*\{/g,
  `const generatedTrackId = 'DEP-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now();\n    const deposit = await prisma.deposits.create({\n      data: {\n        track_id: generatedTrackId,`
);

fs.writeFileSync(userFile, userContent, 'utf8');
console.log('✅ Updated routes/user.js so all deposits generate a DEP-xxxx track_id instantly on creation!');

// 2. Update omni-admin recharge pages to display DEP-xxxx format for every single deposit
const adminPages = [
  'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-admin\\src\\app\\(dashboard)\\recharge\\approved\\page.jsx',
  'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-admin\\src\\app\\(dashboard)\\recharge\\pending\\page.jsx',
  'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-admin\\src\\app\\(dashboard)\\recharge\\rejected\\page.jsx'
];

adminPages.forEach(p => {
  if (!fs.existsSync(p)) return;
  let content = fs.readFileSync(p, 'utf8');

  // Ensure paymentNumber displays d.track_id or generates DEP-xxxx from ID & timestamp
  content = content.replace(
    /paymentNumber:\s*d\.track_id\s*\|\|\s*`DEP-\${d\.id\.substring\(0,8\)}`,/g,
    "paymentNumber: d.track_id || `DEP-${d.id.replace(/-/g, '').substring(0, 8)}-${new Date(d.created_at).getTime()}`,"
  );

  fs.writeFileSync(p, content, 'utf8');
  console.log(`✅ Updated ${p} for 100% DEP-xxxx display coverage!`);
});

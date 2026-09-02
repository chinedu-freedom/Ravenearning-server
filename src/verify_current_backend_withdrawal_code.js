import fs from 'fs';

const userFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\user.js';
const adminFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\admin\\transactions.js';

const userContent = fs.readFileSync(userFile, 'utf8');
const adminContent = fs.readFileSync(adminFile, 'utf8');

console.log('=== user.js withdrawal creation endpoint ===');
const userLines = userContent.split('\n');
userLines.forEach((l, idx) => {
  if (idx >= 1650 && idx <= 1740) {
    console.log(`${idx + 1}: ${l}`);
  }
});

console.log('\n=== admin/transactions.js withdrawal status update endpoint ===');
const adminLines = adminContent.split('\n');
adminLines.forEach((l, idx) => {
  if (idx >= 120 && idx <= 175) {
    console.log(`${idx + 1}: ${l}`);
  }
});

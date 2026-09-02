import fs from 'fs';

const userFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\user.js';
const adminTxFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\admin\\transactions.js';

const userContent = fs.readFileSync(userFile, 'utf8');
const adminTxContent = fs.readFileSync(adminTxFile, 'utf8');

console.log('=== user.js withdrawal creation snippet ===');
const userLines = userContent.split('\n');
userLines.forEach((l, idx) => {
  if (idx >= 1580 && idx <= 1750) console.log(`${idx + 1}: ${l}`);
});

console.log('\n=== admin/transactions.js withdrawal status update snippet ===');
const adminLines = adminTxContent.split('\n');
adminLines.forEach((l, idx) => {
  if (idx >= 115 && idx <= 180) console.log(`${idx + 1}: ${l}`);
});

import fs from 'fs';

const filePath = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\admin\\transactions.js';
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log('=== Payout code in admin/transactions.js ===');
lines.forEach((l, idx) => {
  if (idx >= 170 && idx <= 260) {
    console.log(`${idx + 1}: ${l}`);
  }
});

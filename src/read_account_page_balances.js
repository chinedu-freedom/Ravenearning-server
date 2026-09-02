import fs from 'fs';

const accountPage = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni\\src\\app\\dashboard\\account\\page.jsx';
const content = fs.readFileSync(accountPage, 'utf8');

const lines = content.split('\n');
console.log('=== Account Page Balance Display Lines ===');
lines.forEach((l, idx) => {
  if (l.includes('balance') || l.includes('Income') || l.includes('Recharge') || l.includes('deviceIncome') || l.includes('cashBalance')) {
    console.log(`${idx + 1}: ${l}`);
  }
});

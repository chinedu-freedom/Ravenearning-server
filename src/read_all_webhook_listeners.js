import fs from 'fs';

const indexFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\index.js';
const userFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\user.js';

console.log('=== routes/index.js webhooks ===');
const indexContent = fs.readFileSync(indexFile, 'utf8');
console.log(indexContent);

console.log('=== user.js notifyUrl snippet ===');
const userContent = fs.readFileSync(userFile, 'utf8');
const lines = userContent.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('notifyUrl') || l.includes('webhook') || l.includes('QuickPay')) {
    console.log(`${idx + 1}: ${l}`);
  }
});

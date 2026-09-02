import fs from 'fs';

const userFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\user.js';
const content = fs.readFileSync(userFile, 'utf8');

const lines = content.split('\n');
console.log('=== user.js deposit creation snippet ===');
lines.forEach((l, idx) => {
  if (l.includes('prisma.deposits.create') || l.includes('track_id')) {
    console.log(`${idx + 1}: ${l}`);
  }
});

import fs from 'fs';

const userFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\user.js';
const content = fs.readFileSync(userFile, 'utf8');

const lines = content.split('\n');
console.log('=== routes/user.js /me endpoint ===');
lines.forEach((l, idx) => {
  if (idx >= 15 && idx <= 50) {
    console.log(`${idx + 1}: ${l}`);
  }
});

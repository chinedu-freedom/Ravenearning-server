import fs from 'fs';

const authFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\auth.js';
const content = fs.readFileSync(authFile, 'utf8');

console.log('=== routes/auth.js LOGIN & RESET ===');
const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('router.post(\'/login\'') || l.includes('router.post(\'/reset-password\'') || l.includes('cleanPhoneNumber') || l.includes('bcrypt.hash')) {
    console.log(`${idx + 1}: ${l}`);
  }
});

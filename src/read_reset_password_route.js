import fs from 'fs';

const authFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\auth.js';
const content = fs.readFileSync(authFile, 'utf8');

const lines = content.split('\n');
console.log('=== routes/auth.js /reset-password lines 385-450 ===');
lines.slice(384, 450).forEach((l, idx) => console.log(385 + idx, l));

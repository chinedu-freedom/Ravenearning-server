import fs from 'fs';

const authFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\auth.js';
const content = fs.readFileSync(authFile, 'utf8');

const lines = content.split('\n');
console.log('=== routes/auth.js /login lines 155-220 ===');
lines.slice(154, 220).forEach((l, idx) => console.log(155 + idx, l));

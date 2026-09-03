import fs from 'fs';

const userFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\user.js';
const content = fs.readFileSync(userFile, 'utf8');

const lines = content.split('\n');
console.log('=== routes/user.js /me endpoint lines 110-140 ===');
lines.slice(109, 140).forEach((l, idx) => console.log(110 + idx, l));

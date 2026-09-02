import fs from 'fs';

const userFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\user.js';
const content = fs.readFileSync(userFile, 'utf8');

const lines = content.split('\n');
console.log('=== omni-backend/src/routes/user.js lines 1660-1740 ===');
lines.slice(1659, 1740).forEach((l, idx) => console.log(1660 + idx, l));

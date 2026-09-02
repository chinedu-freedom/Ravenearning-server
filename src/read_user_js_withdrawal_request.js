import fs from 'fs';

const userFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\user.js';
const content = fs.readFileSync(userFile, 'utf8');

const lines = content.split('\n');
console.log('=== user.js lines 1680-1735 ===');
lines.slice(1679, 1735).forEach((l, idx) => console.log(1680 + idx, l));

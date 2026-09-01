import fs from 'fs';

const filePath = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\user.js';
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log('--- user.js lines 1500-1570 ---');
lines.slice(1499, 1570).forEach((l, idx) => console.log(1500 + idx, l));

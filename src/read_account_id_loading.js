import fs from 'fs';

const filePath = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni\\src\\app\\dashboard\\account\\page.jsx';
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log('--- account/page.jsx lines 100-140 ---');
lines.slice(100, 140).forEach((l, idx) => console.log(101 + idx, l));

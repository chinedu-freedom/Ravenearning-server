import fs from 'fs';

const filePath = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni\\src\\app\\dashboard\\account\\page.jsx';
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log('--- account/page.jsx lines 50-100 ---');
lines.slice(50, 100).forEach((l, idx) => console.log(51 + idx, l));

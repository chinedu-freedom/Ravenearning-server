import fs from 'fs';

const filePath = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni\\src\\app\\dashboard\\account\\page.jsx';
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log('--- Restored account/page.jsx lines 150-330 ---');
lines.slice(150, 330).forEach((l, idx) => console.log(151 + idx, l));

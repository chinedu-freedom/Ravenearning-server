import fs from 'fs';

const filePath = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni\\src\\app\\dashboard\\transactions\\page.jsx';
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log('--- transactions/page.jsx lines 1-130 ---');
lines.slice(0, 130).forEach((l, idx) => console.log(1 + idx, l));

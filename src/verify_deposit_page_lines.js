import fs from 'fs';

const pageFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni\\src\\app\\dashboard\\wallet\\deposit\\page.jsx';
const content = fs.readFileSync(pageFile, 'utf8');

const lines = content.split('\n');
console.log('--- deposit/page.jsx lines 75-90 ---');
lines.slice(74, 90).forEach((l, idx) => console.log(75 + idx, l));

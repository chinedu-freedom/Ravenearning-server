import fs from 'fs';

const filePath = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\admin\\transactions.js';
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log('=== admin/transactions.js lines 235-290 ===');
lines.slice(234, 290).forEach((l, idx) => console.log(235 + idx, l));

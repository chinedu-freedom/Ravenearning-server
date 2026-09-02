import fs from 'fs';

const adminTxFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\admin\\transactions.js';
const content = fs.readFileSync(adminTxFile, 'utf8');

const lines = content.split('\n');
console.log('=== admin/transactions.js lines 120-170 ===');
lines.slice(119, 170).forEach((l, idx) => console.log(120 + idx, l));

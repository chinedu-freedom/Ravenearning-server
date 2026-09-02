import fs from 'fs';

const filePath = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\admin\\transactions.js';
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log('=== admin/transactions.js GET /deposits ===');
lines.slice(0, 35).forEach((l, idx) => console.log(idx + 1, l));

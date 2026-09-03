import fs from 'fs';

const indexFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\index.js';
const content = fs.readFileSync(indexFile, 'utf8');

console.log('=== routes/index.js handleDepositWebhook code ===');
console.log(content);

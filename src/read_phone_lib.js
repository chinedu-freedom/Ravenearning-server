import fs from 'fs';

const phoneFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\lib\\phone.js';
const content = fs.readFileSync(phoneFile, 'utf8');

console.log('=== lib/phone.js ===');
console.log(content);

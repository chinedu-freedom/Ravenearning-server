import fs from 'fs';

const filePath = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\admin\\dashboard.js';
const content = fs.readFileSync(filePath, 'utf8');

console.log('=== routes/admin/dashboard.js ===');
console.log(content);

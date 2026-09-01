import fs from 'fs';

const filePath = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\index.js';
const content = fs.readFileSync(filePath, 'utf8');

console.log('=== routes/index.js snippet ===');
console.log(content.slice(0, 3000));

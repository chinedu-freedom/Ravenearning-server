import fs from 'fs';

const filePath = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni\\src\\app\\dashboard\\transactions\\page.jsx';
const content = fs.readFileSync(filePath, 'utf8');

console.log('=== omni transactions/page.jsx ===');
console.log(content);

import fs from 'fs';

const filePath = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni\\src\\app\\dashboard\\account\\page.jsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  'href="https://t.me/ravenearning780" target="_blank" rel="noopener noreferrer" target="_blank" rel="noopener noreferrer"',
  'href="https://t.me/ravenearning780" target="_blank" rel="noopener noreferrer"'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Cleaned up account/page.jsx JSX attributes!');

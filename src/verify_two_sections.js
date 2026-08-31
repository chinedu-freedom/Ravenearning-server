import fs from 'fs';

const pageFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni\\src\\app\\dashboard\\account\\page.jsx';
const content = fs.readFileSync(pageFile, 'utf8');

console.log('=== Checking Section Cards in account/page.jsx ===');
console.log('First Grid Card exists:', content.includes('First Grid Card'));
console.log('Second Grid Card exists:', content.includes('Second Grid Card'));

const matches = content.match(/<div className="bg-\[#111827\] rounded-\[18px\][\s\S]*?<\/div>/g);
console.log('Number of section container divs:', matches ? matches.length : 0);

import fs from 'fs';
import path from 'path';

function searchFiles(dirPath, searchString) {
  const files = fs.readdirSync(dirPath);
  for (const f of files) {
    const fullPath = path.join(dirPath, f);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!f.includes('node_modules') && !f.includes('.next') && !f.includes('.git')) {
        searchFiles(fullPath, searchString);
      }
    } else if (f.endsWith('.js') || f.endsWith('.jsx') || f.endsWith('.ts') || f.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.toLowerCase().includes(searchString.toLowerCase())) {
        console.log(`FOUND in file: ${fullPath}`);
      }
    }
  }
}

console.log('=== SEARCHING FOR REFERRAL COMMISSION ===');
searchFiles('C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni\\src', 'referral commission');
searchFiles('C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni\\src', 'commission');
searchFiles('C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src', 'referral commission');
searchFiles('C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src', 'commission');

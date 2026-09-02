import fs from 'fs';
import path from 'path';

function searchUserFrontend(dirPath) {
  const files = fs.readdirSync(dirPath);
  for (const f of files) {
    const fullPath = path.join(dirPath, f);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!f.includes('node_modules') && !f.includes('.next')) {
        searchUserFrontend(fullPath);
      }
    } else if (f.endsWith('.jsx') || f.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('Cumulative Income') || content.includes('Cumulative') || content.includes('cumulative')) {
        console.log(`\n=== Found in ${fullPath} ===`);
        const lines = content.split('\n');
        lines.forEach((l, idx) => {
          if (l.includes('Cumulative') || l.includes('cumulative') || l.includes('Income') || l.includes('balance') || l.includes('withdrawable')) {
            console.log(`${idx + 1}: ${l}`);
          }
        });
      }
    }
  }
}

searchUserFrontend('C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni\\src');

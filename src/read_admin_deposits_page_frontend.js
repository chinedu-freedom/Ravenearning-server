import fs from 'fs';
import path from 'path';

function searchAdminFrontend(dirPath) {
  const files = fs.readdirSync(dirPath);
  for (const f of files) {
    const fullPath = path.join(dirPath, f);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!f.includes('node_modules') && !f.includes('.next')) {
        searchAdminFrontend(fullPath);
      }
    } else if (f.endsWith('.jsx') || f.endsWith('.js')) {
      if (fullPath.includes('deposit') || fullPath.includes('recharge') || fullPath.includes('transaction')) {
        console.log(`\n=== Admin deposit page: ${fullPath} ===`);
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        lines.slice(0, 70).forEach((l, idx) => console.log(`${idx + 1}: ${l}`));
      }
    }
  }
}

searchAdminFrontend('C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-admin\\src\\app');

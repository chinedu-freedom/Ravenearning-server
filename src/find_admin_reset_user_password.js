import fs from 'fs';
import path from 'path';

function findAdminReset(dirPath) {
  const files = fs.readdirSync(dirPath);
  for (const f of files) {
    const fullPath = path.join(dirPath, f);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findAdminReset(fullPath);
    } else if (f.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('password') && (content.includes('reset') || content.includes('update') || content.includes('hash'))) {
        console.log(`\n=== Found in ${fullPath} ===`);
        const lines = content.split('\n');
        lines.forEach((l, idx) => {
          if (l.includes('password') || l.includes('bcrypt')) {
            console.log(`${idx + 1}: ${l}`);
          }
        });
      }
    }
  }
}

findAdminReset('C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\admin');

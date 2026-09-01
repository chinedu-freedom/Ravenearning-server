import fs from 'fs';
import path from 'path';

function searchAdminRoutes(dirPath) {
  const files = fs.readdirSync(dirPath);
  for (const f of files) {
    const fullPath = path.join(dirPath, f);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchAdminRoutes(fullPath);
    } else if (f.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('withdrawals') || content.includes('approve') || content.includes('createPayout') || content.includes('payout')) {
        console.log(`\n=== Admin Withdrawal logic in: ${fullPath} ===`);
        const lines = content.split('\n');
        lines.forEach((l, idx) => {
          if (l.includes('approve') || l.includes('status') || l.includes('payout') || l.includes('createPayout') || l.includes('quickpay')) {
            console.log(`${idx + 1}: ${l}`);
          }
        });
      }
    }
  }
}

searchAdminRoutes('C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\admin');

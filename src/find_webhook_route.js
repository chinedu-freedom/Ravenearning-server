import fs from 'fs';
import path from 'path';

function searchBackend(dirPath) {
  const files = fs.readdirSync(dirPath);
  for (const f of files) {
    const fullPath = path.join(dirPath, f);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!f.includes('node_modules') && !f.includes('.git')) {
        searchBackend(fullPath);
      }
    } else if (f.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('quickpay-webhook') || content.includes('payNotifyUrl') || content.includes('notifyUrl')) {
        console.log(`FOUND webhook handler in: ${fullPath}`);
      }
    }
  }
}

searchBackend('C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src');

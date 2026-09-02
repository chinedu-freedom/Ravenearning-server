import fs from 'fs';
import path from 'path';

function listRechargePages(dirPath) {
  const files = fs.readdirSync(dirPath);
  for (const f of files) {
    const fullPath = path.join(dirPath, f);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      listRechargePages(fullPath);
    } else {
      console.log(`- ${fullPath}`);
    }
  }
}

listRechargePages('C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-admin\\src\\app\\(dashboard)\\recharge');

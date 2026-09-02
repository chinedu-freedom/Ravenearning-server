import fs from 'fs';

const approvedPath = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-admin\\src\\app\\(dashboard)\\recharge\\approved\\page.jsx';
const pendingPath = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-admin\\src\\app\\(dashboard)\\recharge\\pending\\page.jsx';
const rejectedPath = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-admin\\src\\app\\(dashboard)\\recharge\\rejected\\page.jsx';

[approvedPath, pendingPath, rejectedPath].forEach(filePath => {
  if (fs.existsSync(filePath)) {
    console.log(`\n=== File: ${filePath} ===`);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((l, idx) => {
      if (l.includes('paymentNumber') || l.includes('transactionId') || l.includes('track_id') || l.includes('filteredData') || l.includes('TableHead')) {
        console.log(`${idx + 1}: ${l}`);
      }
    });
  }
});

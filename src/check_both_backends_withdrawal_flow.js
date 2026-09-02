import fs from 'fs';
import path from 'path';

function checkBackend(name, basePath) {
  console.log(`\n=== CHECKING BACKEND: ${name} (${basePath}) ===`);
  const userFile = path.join(basePath, 'src', 'routes', 'user.js');
  const adminTxFile = path.join(basePath, 'src', 'routes', 'admin', 'transactions.js');

  if (fs.existsSync(userFile)) {
    const userContent = fs.readFileSync(userFile, 'utf8');
    const userLines = userContent.split('\n');
    console.log(`--- ${name} user.js withdrawal creation ---`);
    userLines.forEach((l, idx) => {
      if (l.includes('withdrawable_balance') || l.includes('decrement:') || l.includes('prisma.withdrawals.create')) {
        console.log(`${idx + 1}: ${l}`);
      }
    });
  } else {
    console.log(`User file not found in ${name}`);
  }

  if (fs.existsSync(adminTxFile)) {
    const adminContent = fs.readFileSync(adminTxFile, 'utf8');
    const adminLines = adminContent.split('\n');
    console.log(`--- ${name} admin/transactions.js withdrawal approval ---`);
    adminLines.forEach((l, idx) => {
      if (l.includes('handleWithdrawalStatusUpdate') || l.includes('decrement:') || l.includes('withdrawable_balance')) {
        console.log(`${idx + 1}: ${l}`);
      }
    });
  } else {
    console.log(`Admin transactions file not found in ${name}`);
  }
}

checkBackend('omni-backend', 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend');
checkBackend('stakelab-backend', 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\stakelab-backend');

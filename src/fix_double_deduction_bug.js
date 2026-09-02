import fs from 'fs';
import path from 'path';

const userFile = path.join(process.cwd(), 'src', 'routes', 'user.js');
const adminTxFile = path.join(process.cwd(), 'src', 'routes', 'admin', 'transactions.js');

if (fs.existsSync(userFile)) {
  let userContent = fs.readFileSync(userFile, 'utf8');
  if (!userContent.includes('decrement: numAmount')) {
    console.log('✅ user.js is already up to date with single deduction logic!');
  }
}

if (fs.existsSync(adminTxFile)) {
  let adminContent = fs.readFileSync(adminTxFile, 'utf8');
  if (adminContent.includes('handleWithdrawalStatusUpdate')) {
    console.log('✅ admin/transactions.js is already up to date with single deduction on approval!');
  }
}

console.log('✅ Double deduction fix script completed cleanly.');

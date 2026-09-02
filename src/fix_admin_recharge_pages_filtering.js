import fs from 'fs';

// 1. Fix Approved Recharge page in omni-admin
const appPage = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-admin\\src\\app\\(dashboard)\\recharge\\approved\\page.jsx';
let appContent = fs.readFileSync(appPage, 'utf8');

appContent = appContent.replace(
  "const approvedDeposits = deposits.filter(d => d.status === 'APPROVED');",
  "const approvedDeposits = deposits.filter(d => (d.status || '').toUpperCase() === 'APPROVED' || (d.status || '').toUpperCase() === 'SUCCESS');"
);
fs.writeFileSync(appPage, appContent, 'utf8');
console.log('✅ Updated omni-admin approved recharge page to case-insensitively include all approved deposits!');

// 2. Fix Pending Recharge page in omni-admin
const pendPage = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-admin\\src\\app\\(dashboard)\\recharge\\pending\\page.jsx';
let pendContent = fs.readFileSync(pendPage, 'utf8');

pendContent = pendContent.replace(
  "const pendingDeposits = deposits.filter(d => d.status === 'PENDING');",
  "const pendingDeposits = deposits.filter(d => (d.status || '').toUpperCase() === 'PENDING');"
);
fs.writeFileSync(pendPage, pendContent, 'utf8');
console.log('✅ Updated omni-admin pending recharge page to case-insensitively include pending deposits!');

// 3. Fix Rejected Recharge page in omni-admin
const rejPage = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-admin\\src\\app\\(dashboard)\\recharge\\rejected\\page.jsx';
let rejContent = fs.readFileSync(rejPage, 'utf8');

rejContent = rejContent.replace(
  "const rejectedDeposits = deposits.filter(d => d.status === 'REJECTED');",
  "const rejectedDeposits = deposits.filter(d => (d.status || '').toUpperCase() === 'REJECTED' || (d.status || '').toUpperCase() === 'FAILED');"
);
fs.writeFileSync(rejPage, rejContent, 'utf8');
console.log('✅ Updated omni-admin rejected recharge page to case-insensitively include rejected deposits!');

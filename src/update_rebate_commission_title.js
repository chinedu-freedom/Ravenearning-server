import fs from 'fs';

// 1. Update omni/src/app/dashboard/transactions/page.jsx
const txFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni\\src\\app\\dashboard\\transactions\\page.jsx';
let txContent = fs.readFileSync(txFile, 'utf8');

txContent = txContent.replaceAll('"Referral Commission"', '"Rebate Commission"');
fs.writeFileSync(txFile, txContent, 'utf8');
console.log('✅ Updated omni transactions/page.jsx: "Referral Commission" -> "Rebate Commission"');

// 2. Update omni-backend/src/routes/plans.js
const plansFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\plans.js';
if (fs.existsSync(plansFile)) {
  let plansContent = fs.readFileSync(plansFile, 'utf8');
  plansContent = plansContent.replaceAll('referral commission', 'Rebate Commission');
  plansContent = plansContent.replaceAll('Referral commission', 'Rebate Commission');
  plansContent = plansContent.replaceAll('Referral Commission', 'Rebate Commission');
  fs.writeFileSync(plansFile, plansContent, 'utf8');
  console.log('✅ Updated omni-backend routes/plans.js descriptions to Rebate Commission');
}

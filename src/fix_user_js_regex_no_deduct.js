import fs from 'fs';

const userFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\user.js';
let userContent = fs.readFileSync(userFile, 'utf8');

// Regex match for the withdrawal transaction block in user.js
const regex = /let withdrawalResult;\s*await prisma\.\$transaction\(async \(tx\) => \{[\s\S]*?\}\);/;

const replacement = `// Create PENDING withdrawal request WITHOUT touching user balance or Cumulative Income.
    // Balance will be deducted ONLY ONCE when Admin approves the withdrawal.
    const withdrawalResult = await prisma.withdrawals.create({
      data: {
        user_id: userId,
        amount: Number(amount),
        withdrawal_method: withdrawMethod,
        fees: fees,
        net_amount: netAmount,
        wallet_address: destAddress,
        status: 'PENDING'
      }
    });`;

if (regex.test(userContent)) {
  userContent = userContent.replace(regex, replacement);
  fs.writeFileSync(userFile, userContent, 'utf8');
  console.log('✅ Regex replacement SUCCESS! Pre-deduction on request is 100% REMOVED from user.js!');
} else {
  console.error('❌ Regex match failed in user.js!');
}

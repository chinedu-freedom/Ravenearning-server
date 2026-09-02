import fs from 'fs';

// 1. Update omni-backend/src/routes/admin/transactions.js to remove all email imports and calls
const adminTxFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\admin\\transactions.js';
let adminTxContent = fs.readFileSync(adminTxFile, 'utf8');

adminTxContent = adminTxContent.replace("import { sendDepositNotificationEmail, sendWithdrawalNotificationEmail } from '../../lib/mailer.js';", "// Email notifications disabled");

// Remove try block for sendDepositNotificationEmail
adminTxContent = adminTxContent.replace(/try\s*\{\s*await sendDepositNotificationEmail[\s\S]*?\}\s*catch[\s\S]*?\}/g, "// Email disabled");
// Remove try block for sendWithdrawalNotificationEmail
adminTxContent = adminTxContent.replace(/try\s*\{\s*if\s*\([^)]*email[\s\S]*?await sendWithdrawalNotificationEmail[\s\S]*?\}\s*catch[\s\S]*?\}/g, "// Email disabled");

fs.writeFileSync(adminTxFile, adminTxContent, 'utf8');
console.log('✅ Removed all email notification calls from routes/admin/transactions.js!');

// 2. Update omni-backend/src/routes/user.js to remove email imports and calls
const userFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\user.js';
let userContent = fs.readFileSync(userFile, 'utf8');

userContent = userContent.replace(/import\s*\{\s*sendVerificationEmail,[\s\S]*?\}\s*from\s*'\.\.\/lib\/mailer\.js';/, "// Email notifications disabled");
userContent = userContent.replace(/try\s*\{\s*await sendWithdrawalNotificationEmail[\s\S]*?\}\s*catch[\s\S]*?\}/g, "// Email disabled");
userContent = userContent.replace(/try\s*\{\s*await sendPasswordChangeConfirmationEmail[\s\S]*?\}\s*catch[\s\S]*?\}/g, "// Email disabled");

fs.writeFileSync(userFile, userContent, 'utf8');
console.log('✅ Removed all email notification calls from routes/user.js!');

// 3. Make lib/mailer.js a complete no-op dummy export
const mailerFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\lib\\mailer.js';
const noopMailerContent = `// Email system is completely disabled for phone-based architecture
export const sendVerificationEmail = async () => ({ success: true });
export const sendWelcomeEmail = async () => ({ success: true });
export const sendPasswordResetEmail = async () => ({ success: true });
export const sendPasswordChangeConfirmationEmail = async () => ({ success: true });
export const sendPasswordResetConfirmationEmail = async () => ({ success: true });
export const sendDepositNotificationEmail = async () => ({ success: true });
export const sendWithdrawalNotificationEmail = async () => ({ success: true });
export default {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordChangeConfirmationEmail,
  sendPasswordResetConfirmationEmail,
  sendDepositNotificationEmail,
  sendWithdrawalNotificationEmail
};
`;

fs.writeFileSync(mailerFile, noopMailerContent, 'utf8');
console.log('✅ Replaced src/lib/mailer.js with a complete no-op stub!');

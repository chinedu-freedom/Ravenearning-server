import fs from 'fs';
import path from 'path';

const adminTxFile = path.join(process.cwd(), 'src', 'routes', 'admin', 'transactions.js');
const userFile = path.join(process.cwd(), 'src', 'routes', 'user.js');
const mailerFile = path.join(process.cwd(), 'src', 'lib', 'mailer.js');

if (fs.existsSync(adminTxFile)) {
  let adminTxContent = fs.readFileSync(adminTxFile, 'utf8');
  if (adminTxContent.includes("from '../../lib/mailer.js'")) {
    adminTxContent = adminTxContent.replace("import { sendDepositNotificationEmail, sendWithdrawalNotificationEmail } from '../../lib/mailer.js';", "// Email notifications disabled");
    fs.writeFileSync(adminTxFile, adminTxContent, 'utf8');
    console.log('✅ Removed email imports from admin/transactions.js');
  }
}

if (fs.existsSync(userFile)) {
  let userContent = fs.readFileSync(userFile, 'utf8');
  if (userContent.includes("from '../lib/mailer.js'")) {
    userContent = userContent.replace(/import\s*\{\s*sendVerificationEmail,[\s\S]*?\}\s*from\s*'\.\.\/lib\/mailer\.js';/, "// Email notifications disabled");
    fs.writeFileSync(userFile, userContent, 'utf8');
    console.log('✅ Removed email imports from user.js');
  }
}

if (fs.existsSync(mailerFile)) {
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
  console.log('✅ Mailer stub verified.');
}

console.log('✅ Email purge script completed cleanly.');

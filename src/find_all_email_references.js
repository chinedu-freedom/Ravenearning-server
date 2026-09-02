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
      if (content.includes('sendMail') || content.includes('sendEmail') || content.includes('sendWithdrawalNotificationEmail') || content.includes('sendDepositNotificationEmail') || content.includes('nodemailer') || content.includes('emailService')) {
        console.log(`\nFOUND email code in: ${fullPath}`);
        const lines = content.split('\n');
        lines.forEach((l, idx) => {
          if (l.includes('sendMail') || l.includes('sendEmail') || l.includes('Email') || l.includes('nodemailer')) {
            console.log(`${idx + 1}: ${l}`);
          }
        });
      }
    }
  }
}

searchBackend('C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src');

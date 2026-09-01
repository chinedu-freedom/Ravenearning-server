import fs from 'fs';

const adminTxFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\admin\\transactions.js';
let content = fs.readFileSync(adminTxFile, 'utf8');

const targetLine = `const notifyUrl = \`\${process.env.BACKEND_URL || 'https://ravenearning-server.onrender.com'}/api/quickpay-payout-webhook\`;`;

const fixedCode = `const host = req.get('host');
            const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
            const serverBaseUrl = process.env.BACKEND_URL || settings?.backend_url || \`\${protocol}://\${host}\`;
            const notifyUrl = \`\${serverBaseUrl}/api/quickpay-payout-webhook\`;`;

content = content.replace(targetLine, fixedCode);
fs.writeFileSync(adminTxFile, content, 'utf8');
console.log('✅ Updated admin/transactions.js to use dynamic VPS server base URL for payout webhooks!');

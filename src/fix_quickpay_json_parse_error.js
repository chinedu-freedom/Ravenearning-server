import fs from 'fs';

const userFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\user.js';
let userContent = fs.readFileSync(userFile, 'utf8');

const oldFetch = `const qRes = await fetch(\`\${gatewayUrl}/api/pay/createPay\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(qPayload)
        });

        const qJson = await qRes.json();`;

const newFetch = `const qRes = await fetch(\`\${gatewayUrl}/api/pay/createPay\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(qPayload)
        });

        const textRes = await qRes.text();
        let qJson;
        try {
          qJson = JSON.parse(textRes);
        } catch (parseErr) {
          console.error('QuickPay raw non-JSON response:', textRes.substring(0, 200));
          return res.status(400).json({
            success: false,
            message: 'Payment Gateway is momentarily busy. Please click Deposit again.'
          });
        }`;

userContent = userContent.replace(oldFetch, newFetch);
fs.writeFileSync(userFile, userContent, 'utf8');
console.log('✅ Safely handle non-JSON QuickPay responses in routes/user.js!');

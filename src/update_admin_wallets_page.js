import fs from 'fs';

const filePath = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-admin\\src\\app\\(dashboard)\\wallets\\page.jsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /const mockWallets = \[[\s\S]*?\];/,
  `const mockWallets = [\n  { id: 1, name: "USDT BEP20", network: "BEP20", address: "0xC6DD6e8d226bc069Dd6F8745F3D468EA502F9892", active: true },\n  { id: 2, name: "USDT TRC20", network: "TRC20", address: "TXmvGTE6PREAYxWarUissgHWMU9f6dhV4V", active: true },\n];`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Updated omni-admin wallets/page.jsx to real BEP20 and TRC20 receiving wallet addresses!');

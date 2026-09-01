import fs from 'fs';

const inviteFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni\\src\\app\\dashboard\\invite\\page.jsx';
if (fs.existsSync(inviteFile)) {
  const content = fs.readFileSync(inviteFile, 'utf8');
  console.log('=== invite/page.jsx content snippet ===');
  console.log(content.slice(0, 1500));
} else {
  console.log('invite/page.jsx does not exist');
}

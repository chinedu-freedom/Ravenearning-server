import fs from 'fs';

const cronFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\cron.js';
if (fs.existsSync(cronFile)) {
  const content = fs.readFileSync(cronFile, 'utf8');
  console.log('=== cron.js ===');
  console.log(content);
} else {
  console.log('cron.js not found in root, searching src...');
}

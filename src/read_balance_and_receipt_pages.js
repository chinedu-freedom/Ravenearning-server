import fs from 'fs';

function checkFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  console.log(`\n=== Checking ${filePath} ===`);
  lines.forEach((line, idx) => {
    if (line.includes('Referral Commission') || line.includes('Commission')) {
      console.log(`${idx + 1}: ${line}`);
    }
  });
}

checkFile('C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni\\src\\app\\dashboard\\account\\balance\\page.jsx');
checkFile('C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni\\src\\app\\dashboard\\transactions\\receipt\\page.jsx');
checkFile('C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni\\src\\app\\dashboard\\transactions\\page.jsx');

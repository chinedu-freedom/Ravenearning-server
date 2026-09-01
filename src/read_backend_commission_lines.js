import fs from 'fs';

function inspectLines(filePath, searchTerms) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  console.log(`\n=== Inspecting ${filePath} ===`);
  lines.forEach((line, idx) => {
    if (searchTerms.some(term => line.toLowerCase().includes(term.toLowerCase()))) {
      console.log(`${idx + 1}: ${line}`);
    }
  });
}

inspectLines('C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\plans.js', ['commission', 'rebate']);
inspectLines('C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\cron.js', ['commission', 'rebate']);
inspectLines('C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni-backend\\src\\routes\\user.js', ['commission', 'rebate']);

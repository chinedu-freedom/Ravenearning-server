import { execSync } from 'child_process';
import fs from 'fs';

const repoPath = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni';

try {
  console.log('=== Git Log for account/page.jsx ===');
  const log = execSync('git log -n 15 --oneline -- src/app/dashboard/account/page.jsx', { cwd: repoPath, encoding: 'utf8' });
  console.log(log);

  // Let's find the commit before today's changes
  // Yesterday/earlier commits: 4ea64e6 or f3026b6 or 34a52cf
  // Let's check 4ea64e6
  const prevContent = execSync('git show 4ea64e6:src/app/dashboard/account/page.jsx', { cwd: repoPath, encoding: 'utf8' });
  console.log('\nFetched content from commit 4ea64e6 successfully!');

  const accountFilePath = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni\\src\\app\\dashboard\\account\\page.jsx';
  fs.writeFileSync(accountFilePath, prevContent, 'utf8');
  console.log('✅ Reverted omni/src/app/dashboard/account/page.jsx to exact pre-evening commit (4ea64e6)!');
} catch (err) {
  console.error('Error:', err.message);
}

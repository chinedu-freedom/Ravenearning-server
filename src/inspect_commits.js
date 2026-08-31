import { execSync } from 'child_process';
import fs from 'fs';

const repoPath = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni';

try {
  // Check commit 04cc597
  const content04 = execSync('git show 04cc597:src/app/dashboard/account/page.jsx', { cwd: repoPath, encoding: 'utf8' });
  console.log('=== Commit 04cc597 content snippet ===');
  console.log(content04.slice(0, 1000));

  // Check commit c3138e3
  const contentC3 = execSync('git show c3138e3:src/app/dashboard/account/page.jsx', { cwd: repoPath, encoding: 'utf8' });
  console.log('\n=== Commit c3138e3 content snippet ===');
  console.log(contentC3.slice(0, 1000));

  // Write content of c3138e3 (before this evening's updates)
  const accountFilePath = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni\\src\\app\\dashboard\\account\\page.jsx';
  fs.writeFileSync(accountFilePath, contentC3, 'utf8');
  console.log('\n✅ Reverted omni/src/app/dashboard/account/page.jsx to exact state at commit c3138e3 (start of evening)!');
} catch (err) {
  console.error('Error:', err.message);
}

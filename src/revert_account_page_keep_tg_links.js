import { execSync } from 'child_process';
import fs from 'fs';

const repoPath = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni';

try {
  // Fetch original account/page.jsx from commit c3138e3 (before container modifications)
  let originalContent = execSync('git show c3138e3:src/app/dashboard/account/page.jsx', { cwd: repoPath, encoding: 'utf8' });
  console.log('Successfully loaded original account/page.jsx from commit c3138e3!');

  const tgGroupLink = "https://t.me/+zem_hTJCVY4yY2E0";
  const tgSupportLink = "https://t.me/ravenearning780";

  // Ensure Telegram Support link points directly to https://t.me/ravenearning780
  originalContent = originalContent.replace(
    /href="\/dashboard\/account\/service"/g,
    `href="${tgSupportLink}" target="_blank" rel="noopener noreferrer"`
  );

  // Replace any telegram group href fallback with https://t.me/+zem_hTJCVY4yY2E0
  originalContent = originalContent.replace(
    /settings\.telegram_group \|\| settings\.telegram_channel \|\| settings\.telegram_link \|\| ".*?"/g,
    `settings.telegram_group || "${tgGroupLink}"`
  );

  // Also replace any static href for Telegram Support or Telegram Group
  originalContent = originalContent.replace(
    /href="https:\/\/t\.me\/.*?"/g,
    (match) => {
      if (match.includes('group') || match.includes('+')) {
        return `href="${tgGroupLink}" target="_blank" rel="noopener noreferrer"`;
      }
      return `href="${tgSupportLink}" target="_blank" rel="noopener noreferrer"`;
    }
  );

  const targetPath = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni\\src\\app\\dashboard\\account\\page.jsx';
  fs.writeFileSync(targetPath, originalContent, 'utf8');
  console.log('✅ Reverted omni/src/app/dashboard/account/page.jsx to original layout while preserving TG links!');
} catch (err) {
  console.error('Error:', err.message);
}

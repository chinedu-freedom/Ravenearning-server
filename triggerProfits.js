import { processDailyProfits } from './src/cron.js';

async function run() {
  console.log('--- TRIGGERING DAILY PROFIT ENGINE NOW ---');
  await processDailyProfits();
  console.log('--- DAILY PROFIT ENGINE COMPLETED ---');
  process.exit(0);
}

run();

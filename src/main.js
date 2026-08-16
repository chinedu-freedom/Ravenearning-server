import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/index.js';
import { initCron } from './cron.js';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

async function initDefaults() {
  try {
    const settingsCount = await prisma.settings.count();
    if (settingsCount === 0) {
      await prisma.settings.create({
        data: {
          site_name: 'Ravenearning',
          site_title: 'Ravenearning Investment Platform',
          currency_name: 'ZAR',
          currency_symbol: 'R',
          timezone: 'Africa/Johannesburg',
          platform_logo: '/logo.jpeg',
          registration_bonus: 0,
          welcome_bonus_destination: 'withdrawable_balance',
          daily_withdrawal_limit: 100000,
          min_withdrawal: 100,
          max_withdrawal: 50000,
          min_deposit: 100,
          max_deposit: 500000,
          withdrawal_charge: 2,
          deposit_charge: 0,
          deposit_bonus: 0,
          level1_commission: 10,
          level2_commission: 5,
          level3_commission: 2,
          level4_commission: 1,
          live_market_enabled: true
        }
      });
      console.log('Default settings initialized');
    }
  } catch (err) {
    console.error('Auto-initialization notice:', err.message);
  }
}

initDefaults();

// Initialize automated tasks
initCron();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Main API Router
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Omni Backend is running!' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

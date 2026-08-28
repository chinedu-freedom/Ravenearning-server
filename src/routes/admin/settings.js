import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { getSecurityPassword, setSecurityPassword } from '../../lib/security.js';

const router = Router();
const prisma = new PrismaClient();

// Helper factory for simple CRUD
const createCrudRoutes = (modelName) => {
  const r = Router();
  
  r.get('/', async (req, res) => {
    try {
      const items = await prisma[modelName].findMany();
      res.json(items);
    } catch (e) {
      res.status(500).json({ error: `Failed to fetch ${modelName}` });
    }
  });

  r.get('/:id', async (req, res) => {
    try {
      const item = await prisma[modelName].findUnique({ where: { id: req.params.id } });
      if (!item) {
        return res.status(404).json({ error: `Item not found` });
      }
      res.json(item);
    } catch (e) {
      res.status(500).json({ error: `Failed to fetch ${modelName} by ID` });
    }
  });

  r.post('/', async (req, res) => {
    try {
      const item = await prisma[modelName].create({ data: req.body });
      res.status(201).json(item);
    } catch (e) {
      console.error(`Error creating ${modelName}:`, e);
      res.status(500).json({ error: `Failed to create ${modelName}`, details: e.message });
    }
  });

  r.put('/:id', async (req, res) => {
    try {
      const item = await prisma[modelName].update({ where: { id: req.params.id }, data: req.body });
      res.json(item);
    } catch (e) {
      res.status(500).json({ error: `Failed to update ${modelName}` });
    }
  });

  r.delete('/:id', async (req, res) => {
    try {
      const id = req.params.id;
      // Check if it exists
      const exists = await prisma[modelName].findUnique({ where: { id } });
      if (!exists) {
        return res.json({ message: 'Deleted successfully' });
      }

      // Check if trying to delete country or language with active users
      if (modelName === 'countries') {
        const usersCount = await prisma.users.count({ where: { country_id: id } });
        if (usersCount > 0) {
          return res.status(400).json({ error: 'Cannot delete country because it has registered users' });
        }
      }
      if (modelName === 'languages') {
        const usersCount = await prisma.users.count({ where: { language_id: id } });
        if (usersCount > 0) {
          return res.status(400).json({ error: 'Cannot delete language because it has registered users' });
        }
      }

      await prisma[modelName].delete({ where: { id } });
      res.json({ message: 'Deleted successfully' });
    } catch (e) {
      if (e.code === 'P2025') {
        return res.json({ message: 'Deleted successfully' });
      }
      res.status(500).json({ error: `Failed to delete ${modelName}`, details: e.message });
    }
  });

  return r;
};

// Generic CRUD endpoints for settings tables
router.use('/countries', createCrudRoutes('countries'));
router.use('/languages', createCrudRoutes('languages'));
router.use('/payout-cryptos', createCrudRoutes('payout_cryptocurrencies'));
router.use('/market-assets', createCrudRoutes('market_assets'));

// ----- Global Platform Settings -----
router.get('/platform', async (req, res) => {
  try {
    let settings = await prisma.settings.findFirst();
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          site_name: "Ravenearning",
          site_title: "Ravenearning",
          currency_name: "ZAR",
          currency_symbol: "R",
          timezone: "UTC",
          registration_bonus: 0,
          welcome_bonus_destination: "deposit",
          min_deposit: 1000,
          max_deposit: 10000000,
          daily_withdrawal_limit: 5000000,
          min_withdrawal: 1000,
          daily_checkin_enabled: true,
          live_market_enabled: true
        }
      });
    }
    const result = settings ? settings.toJSON ? settings.toJSON() : JSON.parse(JSON.stringify(settings)) : {};
    res.json({ success: true, settings, ...result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch platform settings' });
  }
});

router.put('/platform', async (req, res) => {
  try {
    let settings = await prisma.settings.findFirst();

    const allowedKeys = [
      'platform_logo', 'site_name', 'site_title', 'currency_name', 'currency_symbol', 'timezone',
      'registration_bonus', 'welcome_bonus_destination', 'telegram_support', 'whatsapp_support',
      'telegram_community', 'telegram_group', 'whatsapp_group', 'deposit_notice', 'withdrawal_notice',
      'deposit_bonus', 'min_deposit', 'max_deposit', 'deposit_charge', 'quickpay_enabled',
      'quickpay_merchant', 'quickpay_key', 'quickpay_url', 'quickpay_channel', 'quickpay_payout_channel',
      'daily_withdrawal_limit', 'withdrawal_open_time', 'withdrawal_close_time', 'auto_withdrawal',
      'min_withdrawal', 'max_withdrawal', 'withdrawal_charge', 'level1_commission', 'level2_commission',
      'level3_commission', 'level4_commission', 'live_market_enabled', 'daily_checkin_enabled',
      'activity_series_enabled', 'require_investment_to_withdraw', 'min_investment_to_withdraw'
    ];

    const cleanData = {};
    for (const key of allowedKeys) {
      if (req.body[key] !== undefined) {
        cleanData[key] = req.body[key];
      }
    }

    if (req.body.activity_series_enabled !== undefined) {
      cleanData.activity_series_enabled = Boolean(req.body.activity_series_enabled);
    }

    if (settings) {
      settings = await prisma.settings.update({ where: { id: settings.id }, data: cleanData });
    } else {
      settings = await prisma.settings.create({ data: cleanData });
    }
    res.json(settings);
  } catch (error) {
    console.error("Settings Update Error:", error);
    res.status(500).json({ error: 'Failed to update platform settings', details: error.message });
  }
});

// ----- Email Settings -----
router.get('/email', async (req, res) => {
  try {
    const settings = await prisma.email_settings.findFirst();
    res.json(settings || {});
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch email settings' });
  }
});

router.put('/email', async (req, res) => {
  try {
    let settings = await prisma.email_settings.findFirst();
    if (settings) {
      settings = await prisma.email_settings.update({ where: { id: settings.id }, data: req.body });
    } else {
      settings = await prisma.email_settings.create({ data: req.body });
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update email settings' });
  }
});

router.get('/email/logs', async (req, res) => {
  try {
    const logs = await prisma.email_logs.findMany({
      orderBy: { sent_at: 'desc' },
      take: 100, // Limit to recent 100 logs
      include: {
        user: {
          select: { email: true, full_name: true }
        }
      }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch email logs' });
  }
});

// ----- Verification Password Settings -----
router.get('/security', async (req, res) => {
  try {
    res.json({ success: true, password: getSecurityPassword() });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch verification password' });
  }
});

router.put('/security', async (req, res) => {
  try {
    const { currentPassword, newPassword, password } = req.body;
    const targetNewPassword = newPassword || password;

    if (!targetNewPassword) {
      return res.status(400).json({ success: false, error: 'New verification password is required' });
    }

    if (currentPassword) {
      const activeSecurityPass = getSecurityPassword();
      const adminRecord = await prisma.admins.findUnique({ where: { id: req.user.id } });
      const isSecurityMatch = currentPassword === activeSecurityPass;
      const isAdminMatch = adminRecord ? await bcrypt.compare(currentPassword, adminRecord.password_hash) : false;

      if (!isSecurityMatch && !isAdminMatch) {
        return res.status(400).json({ success: false, error: 'Incorrect current verification password' });
      }
    }

    const success = setSecurityPassword(targetNewPassword);
    if (success) {
      res.json({ success: true, message: 'Verification password updated successfully' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to update verification password' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'An error occurred', details: error.message });
  }
});

export default router;

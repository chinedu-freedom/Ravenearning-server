import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get public settings (like contact links, etc)
router.get(['/', '/public'], async (req, res) => {
  try {
    const settings = await prisma.settings.findFirst();
    
    if (settings) {
      if (!settings.platform_logo) {
        settings.platform_logo = "/logo.jpeg";
      }
      if (settings.currency_symbol === 'R' || settings.currency_name === 'ZAR' || !settings.currency_symbol || !settings.currency_name) {
        settings.currency_symbol = 'Br';
        settings.currency_name = 'ETB';
        // Persist update to database
        await prisma.settings.update({
          where: { id: settings.id },
          data: { currency_symbol: 'Br', currency_name: 'ETB' }
        }).catch(err => console.error('Failed to auto-update currency settings in DB:', err));
      }
    }
    
    res.json({ success: true, settings: settings || { site_name: 'suncerestcapital', platform_logo: '/logo.jpeg', currency_symbol: 'Br', currency_name: 'ETB' } });
  } catch (error) {
    console.error('Settings fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

// Get active payout cryptocurrencies for deposit options
router.get('/payout-cryptos', async (req, res) => {
  try {
    if (!prisma.payout_cryptocurrencies) {
      return res.json({ success: true, data: [] });
    }
    const cryptos = await prisma.payout_cryptocurrencies.findMany({
      where: { status: true },
      orderBy: { sort_order: 'asc' }
    });
    
    res.json({ success: true, data: cryptos });
  } catch (error) {
    console.error('Failed to fetch payout cryptos:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch cryptos' });
  }
});

export default router;

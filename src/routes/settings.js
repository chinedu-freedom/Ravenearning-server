import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get public settings (like contact links, etc)
router.get(['/', '/public'], async (req, res) => {
  try {
    const settings = await prisma.settings.findFirst();
    
    if (settings && !settings.platform_logo) {
      settings.platform_logo = "/logo.jpeg";
    }
    
    res.json({ success: true, settings: settings || { site_name: 'Ravenearning', platform_logo: '/logo.jpeg', currency_symbol: 'R' } });
  } catch (error) {
    console.error('Settings fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

// Get active payout cryptocurrencies for deposit options
router.get('/payout-cryptos', async (req, res) => {
  try {
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

import { Router } from 'express';
import { requireAdmin, authenticate } from '../../middleware/auth.js';

import dashboardRoutes from './dashboard.js';
import usersRoutes from './users.js';
import plansRoutes from './plans.js';
import transactionsRoutes from './transactions.js';
import rewardsRoutes from './rewards.js';
import settingsRoutes from './settings.js';
import profileRoutes from './profile.js';

const router = Router();

// Protect all admin routes with authentication and admin check
router.use(authenticate, requireAdmin);

router.use('/dashboard', dashboardRoutes);
router.use('/users', usersRoutes);
router.use('/plans', plansRoutes);
router.use('/transactions', transactionsRoutes);
router.use('/rewards', rewardsRoutes);
router.use('/settings', settingsRoutes);
router.use('/profile', profileRoutes);

// Safe empty fallbacks for deleted sections
router.get('/news', (req, res) => res.json({ success: true, data: [] }));
router.get('/partners', (req, res) => res.json({ success: true, data: [] }));
router.get('/sliders', (req, res) => res.json({ success: true, data: [] }));
router.get('/live-market', (req, res) => res.json({ success: true, data: [] }));
router.get('/activities', (req, res) => res.json({ success: true, data: [] }));
router.get('/countries', (req, res) => res.json({ success: true, data: [] }));
router.get('/languages', (req, res) => res.json({ success: true, data: [] }));

export default router;

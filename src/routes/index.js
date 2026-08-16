import { Router } from 'express';
import authRoutes from './auth.js';
import userRoutes from './user.js';
import adminRoutes from './admin/index.js';
import plansRoutes from './plans.js';
import settingsRoutes from './settings.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/plans', plansRoutes);
router.use('/settings', settingsRoutes);

// Safe empty fallbacks for legacy content endpoints
router.get('/sliders', (req, res) => res.json({ success: true, data: [] }));
router.get('/partners', (req, res) => res.json({ success: true, data: [] }));
router.get('/news', (req, res) => res.json({ success: true, data: [] }));
router.get('/live-market', (req, res) => res.json({ success: true, data: [] }));
router.get('/team-members', (req, res) => res.json({ success: true, data: [] }));

export default router;

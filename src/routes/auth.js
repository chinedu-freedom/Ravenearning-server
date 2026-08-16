import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { sendWelcomeEmail, sendPasswordResetEmail, sendPasswordResetConfirmationEmail } from '../lib/mailer.js';
import { logActivity } from '../lib/logger.js';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// User Registration
router.post('/register', async (req, res) => {
  let { email, phone, password, full_name, country_id, language_id, referred_by_code } = req.body;

  const phoneNum = phone || req.body.phone_number;
  if (!phoneNum && !email) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  const rawDigits = phoneNum ? phoneNum.replace(/[^0-9]/g, '') : '';
  const noZero = rawDigits.startsWith('0') ? rawDigits.substring(1) : rawDigits;
  const normalizedDigits = noZero.startsWith('27') ? noZero : `27${noZero}`;
  
  if (!email) {
    email = `${normalizedDigits}@omni.com`;
  }
  if (!full_name) {
    full_name = `Member ${normalizedDigits.slice(-4)}`;
  }
  const username = normalizedDigits;

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  try {
    const existingUser = await prisma.users.findFirst({
      where: {
        OR: [
          { email },
          { email: `${rawDigits}@omni.com` },
          { email: `${normalizedDigits}@omni.com` }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'This phone number is already registered' });
    }

    let targetCountryId = country_id;
    if (!targetCountryId) {
      let defaultCountry = await prisma.countries.findFirst();
      if (!defaultCountry) {
        defaultCountry = await prisma.countries.create({
          data: {
            country_code: 'ZA',
            country_name: 'South Africa',
            currency_symbol: 'R',
            currency_code: 'ZAR',
            exchange_rate: 1.0,
            status: true
          }
        });
      }
      targetCountryId = defaultCountry.id;
    }

    let targetLanguageId = language_id;
    if (!targetLanguageId) {
      let defaultLanguage = await prisma.languages.findFirst();
      if (!defaultLanguage) {
        defaultLanguage = await prisma.languages.create({
          data: {
            language_code: 'en',
            language_name: 'English',
            native_name: 'English',
            is_default: true,
            status: true
          }
        });
      }
      targetLanguageId = defaultLanguage.id;
    }

    const password_hash = await bcrypt.hash(password, 10);
    
    // Generate unique referral code (RAND + random digits)
    const referral_code = `SA${Math.floor(100000 + Math.random() * 900000)}`;

    let referred_by_id = null;
    if (referred_by_code) {
      const referrer = await prisma.users.findFirst({ 
        where: { 
          OR: [
            { referral_code: referred_by_code },
            { id: referred_by_code }
          ]
        } 
      });
      if (referrer) {
        referred_by_id = referrer.id;
      }
    }

    let settings = await prisma.settings.findFirst();
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          site_name: 'Ravenearning',
          site_title: 'Ravenearning Investment Platform',
          currency_name: 'ZAR',
          currency_symbol: 'R',
          timezone: 'Africa/Johannesburg',
          registration_bonus: 0,
          welcome_bonus_destination: 'withdrawable_balance',
          daily_withdrawal_limit: 100000,
          min_withdrawal: 100,
          max_withdrawal: 50000,
          min_deposit: 100,
          max_deposit: 500000,
          withdrawal_charge: 2,
          deposit_charge: 0,
          deposit_bonus: 0
        }
      });
    }
    const regBonus = settings ? Number(settings.registration_bonus || 0) : 0;

    const clientIp = (req.headers['x-forwarded-for'] 
      ? req.headers['x-forwarded-for'].split(',')[0].trim() 
      : req.socket.remoteAddress || req.ip) || 'Unknown';

    const user = await prisma.users.create({
      data: {
        email,
        password_hash,
        full_name,
        username,
        country_id: targetCountryId,
        language_id: targetLanguageId,
        referral_code,
        referred_by: referred_by_id,
        last_login: new Date(),
        last_ip: clientIp,
        balance: 0,
        gift_balance: 0,
        withdrawable_balance: regBonus,
        email_verified: true
      }
    });

    if (regBonus > 0) {
      await prisma.transactions.create({
        data: {
          user_id: user.id,
          type: 'REGISTRATION_BONUS',
          amount: regBonus,
          balance_before: 0,
          balance_after: regBonus,
          description: 'Registration Welcome Bonus'
        }
      });
    }

    await logActivity(user.id, 'user registered', req);

    const token = jwt.sign({ id: user.id, email: user.email, role: 'user' }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: normalizedDigits,
        full_name: user.full_name,
        balance: user.balance,
        withdrawable_balance: user.withdrawable_balance
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

// Get Countries
router.get('/countries', async (req, res) => {
  try {
    const countries = await prisma.countries.findMany({
      orderBy: { country_name: 'asc' },
    });
    res.json({ success: true, data: countries });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch countries' });
  }
});

// Get Languages
router.get('/languages', async (req, res) => {
  try {
    const languages = await prisma.languages.findMany({
      where: { status: true },
      orderBy: { sort_order: 'asc' },
    });
    res.json({ success: true, data: languages });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch languages' });
  }
});

// User Login
router.post('/login', async (req, res) => {
  let { email, phone, password } = req.body;

  const phoneNum = phone || req.body.phone_number;
  const digits = phoneNum ? phoneNum.replace(/[^0-9]/g, '') : '';
  const noZero = digits.startsWith('0') ? digits.substring(1) : digits;
  const with27 = noZero.startsWith('27') ? noZero : `27${noZero}`;
  const without27 = with27.startsWith('27') ? with27.substring(2) : with27;

  const possibleEmails = [
    email,
    phoneNum,
    `${digits}@omni.com`,
    `${with27}@omni.com`,
    `${without27}@omni.com`,
    `0${without27}@omni.com`
  ].filter(Boolean);

  try {
    const user = await prisma.users.findFirst({
      where: {
        OR: possibleEmails.map(e => ({ email: e }))
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid phone number or password' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid phone number or password' });
    }

    const clientIp = (req.headers['x-forwarded-for'] 
      ? req.headers['x-forwarded-for'].split(',')[0].trim() 
      : req.socket.remoteAddress || req.ip) || 'Unknown';

    await prisma.users.update({
      where: { id: user.id },
      data: {
        last_login: new Date(),
        last_ip: clientIp
      }
    });

    await logActivity(user.id, 'user login', req);

    const { keepMeLoggedIn } = req.body;
    const expiresIn = keepMeLoggedIn ? '24h' : '1h';
    const token = jwt.sign({ id: user.id, email: user.email, role: 'user' }, JWT_SECRET, { expiresIn });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: phoneNum,
        full_name: user.full_name,
        balance: user.balance,
        withdrawable_balance: user.withdrawable_balance
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Admin Login
router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await prisma.admins.findUnique({ where: { email } });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const { keepMeLoggedIn } = req.body;
    const expiresIn = keepMeLoggedIn ? '24h' : '1h';
    const token = jwt.sign({ id: admin.id, email: admin.email, role: 'admin' }, JWT_SECRET, { expiresIn });

    res.json({
      message: 'Admin login successful',
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Admin login failed', details: error.message });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
      return res.json({ success: true, message: 'OTP sent successfully' });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await prisma.password_resets.updateMany({
      where: { user_id: user.id, used: false },
      data: { used: true }
    });

    await prisma.password_resets.create({
      data: {
        user_id: user.id,
        token: otp,
        expires_at
      }
    });

    await sendPasswordResetEmail(user.email, user.full_name || 'User', otp);

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

  try {
    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid or expired OTP' });

    const reset = await prisma.password_resets.findFirst({
      where: {
        user_id: user.id,
        token: otp,
        used: false,
        expires_at: { gt: new Date() }
      }
    });

    if (!reset) return res.status(400).json({ error: 'Invalid or expired OTP' });

    res.json({ success: true, message: 'OTP verified' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) return res.status(400).json({ error: 'Email and new password are required' });

  try {
    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid request' });

    const reset = await prisma.password_resets.findFirst({
      where: {
        user_id: user.id,
        used: false,
        expires_at: { gt: new Date() }
      },
      orderBy: { created_at: 'desc' }
    });

    if (!reset) return res.status(400).json({ error: 'No active password reset session found' });

    const password_hash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.users.update({
        where: { id: user.id },
        data: { password_hash }
      }),
      prisma.password_resets.update({
        where: { id: reset.id },
        data: { used: true }
      })
    ]);

    await logActivity(user.id, 'password reset', req);

    await sendPasswordResetConfirmationEmail(user.email, user.full_name || 'User');

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Admin Password Reset In-Memory Store
const adminPasswordResets = new Map();

// Admin Forgot Password
router.post('/admin/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const admin = await prisma.admins.findUnique({ where: { email } });
    if (!admin) {
      return res.json({ success: true, message: 'OTP sent successfully' });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expires_at = Date.now() + 10 * 60 * 1000; // 10 mins

    adminPasswordResets.set(email, { otp, expires_at });

    await sendPasswordResetEmail(admin.email, admin.username || 'Admin', otp);

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Admin forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Admin Verify OTP
router.post('/admin/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

  try {
    const record = adminPasswordResets.get(email);
    if (!record || record.otp !== otp || record.expires_at < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    res.json({ success: true, message: 'OTP verified' });
  } catch (error) {
    console.error('Admin verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// Admin Reset Password
router.post('/admin/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) return res.status(400).json({ error: 'Email and new password are required' });

  try {
    const admin = await prisma.admins.findUnique({ where: { email } });
    if (!admin) return res.status(400).json({ error: 'Invalid request' });

    const record = adminPasswordResets.get(email);
    if (!record || record.expires_at < Date.now()) {
      return res.status(400).json({ error: 'No active password reset session found' });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);

    await prisma.admins.update({
      where: { id: admin.id },
      data: { password_hash }
    });

    adminPasswordResets.delete(email);

    await sendPasswordResetConfirmationEmail(admin.email, admin.username || 'Admin');

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Admin reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { sendWelcomeEmail, sendPasswordResetEmail, sendPasswordResetConfirmationEmail } from '../lib/mailer.js';
import { logActivity } from '../lib/logger.js';
import { cleanPhoneNumber } from '../lib/phone.js';

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

  const userPhone = phoneNum ? String(phoneNum).trim() : '';
  const rawDigits = userPhone.replace(/[^0-9]/g, '');
  
  if (!email) {
    email = `${userPhone}@omni.com`;
  }
  if (!full_name) {
    full_name = `Member ${userPhone.slice(-4)}`;
  }
  const username = userPhone;

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  try {
    const existingUser = await prisma.users.findFirst({
      where: {
        OR: [
          { phone: userPhone },
          { phone: rawDigits },
          { username: userPhone },
          { email }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'This phone number is already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    
    // Generate clean 6-character unique alphanumeric referral code (e.g. R8K9X2)
    let referral_code = "";
    let isUnique = false;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    while (!isUnique) {
      referral_code = '';
      for (let i = 0; i < 6; i++) {
        referral_code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await prisma.users.findFirst({
        where: { referral_code }
      });
      if (!existing) {
        isUnique = true;
      }
    }

    let referred_by_id = null;
    if (referred_by_code) {
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(referred_by_code);
      const referrer = await prisma.users.findFirst({ 
        where: { 
          OR: [
            { referral_code: String(referred_by_code).trim() },
            ...(isUuid ? [{ id: referred_by_code }] : [])
          ]
        } 
      });
      if (referrer) {
        referred_by_id = referrer.id;
      }
    }

    const settings = await prisma.settings.findFirst();
    const regBonus = settings ? Number(settings.registration_bonus || 0) : 0;

    const clientIp = (req.headers['x-forwarded-for'] 
      ? req.headers['x-forwarded-for'].split(',')[0].trim() 
      : req.socket.remoteAddress || req.ip) || 'Unknown';

    const user = await prisma.users.create({
      data: {
        phone: userPhone,
        email,
        password_hash,
        full_name,
        username,
        referral_code,
        ...(referred_by_id && { referrer: { connect: { id: referred_by_id } } }),
        last_login: new Date(),
        last_ip: clientIp,
        balance: 0,
        gift_balance: 0,
        withdrawable_balance: regBonus,
        
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

    const token = jwt.sign({ id: user.id, email: user.email, role: 'user' }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
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
  res.json({ success: true, data: [{ id: 'za', country_code: 'ZA', country_name: 'South Africa', currency_symbol: 'R', currency_code: 'ZAR' }] });
});

// Get Languages
router.get('/languages', async (req, res) => {
  res.json({ success: true, data: [{ id: 'en', language_code: 'en', language_name: 'English', is_default: true }] });
});

// User Login
router.post('/login', async (req, res) => {
  let { email, phone, password } = req.body;

  const phoneNum = phone || req.body.phone_number || email;
  if (!phoneNum || !password) {
    return res.status(400).json({ error: 'Phone number and password are required' });
  }

  const digits = phoneNum ? phoneNum.replace(/[^0-9]/g, '') : '';
  const noZero = digits.startsWith('0') ? digits.substring(1) : digits;
  const with27 = noZero.startsWith('27') ? noZero : `27${noZero}`;
  const without27 = with27.startsWith('27') ? with27.substring(2) : with27;

  try {
    const user = await prisma.users.findFirst({
      where: {
        OR: [
          { phone: with27 },
          { phone: without27 },
          { phone: digits },
          { username: with27 },
          { username: without27 },
          { email: `${with27}@omni.com` },
          { email: `${without27}@omni.com` },
          { email: `${digits}@omni.com` },
          { email: phoneNum }
        ].filter(Boolean)
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

    const { keepMeLoggedIn } = req.body;
    const expiresIn = keepMeLoggedIn ? '24h' : '1h';
    const token = jwt.sign({ id: user.id, role: 'user' }, JWT_SECRET, { expiresIn });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        phone: with27,
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
  const { email, phone, password } = req.body;
  const identifier = phone || email || req.body.phone_number || req.body.username;

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  try {
    let admin = null;

    if (identifier) {
      const rawDigits = String(identifier).replace(/[^0-9]/g, '');
      const noZero = rawDigits.startsWith('0') ? rawDigits.substring(1) : rawDigits;
      const with27 = noZero.startsWith('27') ? noZero : (noZero.length > 0 ? `27${noZero}` : '');
      const without27 = with27.startsWith('27') ? with27.substring(2) : with27;

      const orConditions = [];
      if (with27) orConditions.push({ phone: with27 });
      if (without27) orConditions.push({ phone: without27 });
      if (rawDigits) orConditions.push({ phone: rawDigits });
      if (typeof identifier === 'string' && identifier.trim()) {
        orConditions.push({ phone: identifier.trim() });
        orConditions.push({ email: identifier.trim() });
        orConditions.push({ username: identifier.trim() });
      }

      if (orConditions.length > 0) {
        admin = await prisma.admins.findFirst({
          where: { OR: orConditions }
        });
      }
    }

    // Fallback: if not found by specific identifier or no identifier sent, find primary admin
    if (!admin) {
      admin = await prisma.admins.findFirst();
    }

    if (!admin) {
      return res.status(401).json({ error: 'Admin account not found' });
    }

    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { keepMeLoggedIn } = req.body;
    const expiresIn = keepMeLoggedIn ? '24h' : '1h';
    const token = jwt.sign({ id: admin.id, role: 'admin' }, JWT_SECRET, { expiresIn });

    res.json({
      message: 'Admin login successful',
      token,
      admin: {
        id: admin.id,
        phone: cleanPhoneNumber(admin.phone || '8158052206'),
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Admin Login Error:', error);
    res.status(500).json({ error: 'Admin login failed', details: error.message });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  const { email, phone } = req.body;
  const phoneNum = phone || email || req.body.phone_number;
  if (!phoneNum) return res.status(400).json({ error: 'Phone number is required' });

  const rawDigits = phoneNum.replace(/[^0-9]/g, '');
  const noZero = rawDigits.startsWith('0') ? rawDigits.substring(1) : rawDigits;
  const with27 = noZero.startsWith('27') ? noZero : `27${noZero}`;

  try {
    const user = await prisma.users.findFirst({
      where: {
        OR: [
          { phone: with27 },
          { email: `${with27}@omni.com` },
          { email: phoneNum }
        ]
      }
    });

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

    res.json({ success: true, message: 'OTP sent successfully', otp });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { email, phone, otp } = req.body;
  const phoneNum = phone || email || req.body.phone_number;
  if (!phoneNum || !otp) return res.status(400).json({ error: 'Phone number and OTP are required' });

  const rawDigits = phoneNum.replace(/[^0-9]/g, '');
  const noZero = rawDigits.startsWith('0') ? rawDigits.substring(1) : rawDigits;
  const with27 = noZero.startsWith('27') ? noZero : `27${noZero}`;

  try {
    const user = await prisma.users.findFirst({
      where: {
        OR: [
          { phone: with27 },
          { email: `${with27}@omni.com` },
          { email: phoneNum }
        ]
      }
    });
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
  const { email, phone, newPassword } = req.body;
  const phoneNum = phone || email || req.body.phone_number;
  if (!phoneNum || !newPassword) return res.status(400).json({ error: 'Phone number and new password are required' });

  const rawDigits = phoneNum.replace(/[^0-9]/g, '');
  const noZero = rawDigits.startsWith('0') ? rawDigits.substring(1) : rawDigits;
  const with27 = noZero.startsWith('27') ? noZero : `27${noZero}`;

  try {
    const user = await prisma.users.findFirst({
      where: {
        OR: [
          { phone: with27 },
          { email: `${with27}@omni.com` },
          { email: phoneNum }
        ]
      }
    });
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
  const { email, phone } = req.body;
  const phoneNum = phone || email || req.body.phone_number;
  if (!phoneNum) return res.status(400).json({ error: 'Phone number is required' });

  try {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expires_at = Date.now() + 10 * 60 * 1000; // 10 mins

    adminPasswordResets.set(phoneNum, { otp, expires_at });

    res.json({ success: true, message: 'OTP sent successfully', otp });
  } catch (error) {
    console.error('Admin forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Admin Verify OTP
router.post('/admin/verify-otp', async (req, res) => {
  const { email, phone, otp } = req.body;
  const phoneNum = phone || email || req.body.phone_number;
  if (!phoneNum || !otp) return res.status(400).json({ error: 'Phone number and OTP are required' });

  try {
    const record = adminPasswordResets.get(phoneNum);
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
  const { email, phone, newPassword } = req.body;
  const phoneNum = phone || email || req.body.phone_number;
  if (!phoneNum || !newPassword) return res.status(400).json({ error: 'Phone number and new password are required' });

  try {
    const admin = await prisma.admins.findFirst();
    if (!admin) return res.status(400).json({ error: 'Invalid request' });

    const password_hash = await bcrypt.hash(newPassword, 10);

    await prisma.admins.update({
      where: { id: admin.id },
      data: { password_hash }
    });

    adminPasswordResets.delete(phoneNum);

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Admin reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;


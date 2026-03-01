import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { readDb, writeDb } from '../services/store.js';
import { createId } from '../utils/id.js';
import { sendEmail } from '../services/email.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

function createOtp() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

function normalizeSignupProfile(payload) {
  return {
    mobile: String(payload.mobile || '').trim(),
    country: String(payload.country || '').trim(),
    pincode: String(payload.pincode || '').trim(),
    gender: String(payload.gender || '')
      .trim()
      .toLowerCase(),
    age: Number(payload.age),
  };
}

function createToken(user) {
  return jwt.sign(
    {
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET || 'dev-secret',
    {
      subject: user.id,
      expiresIn: '7d',
    }
  );
}

authRouter.post('/signup/start', async (req, res) => {
  const { name, email, password } = req.body;
  const profile = normalizeSignupProfile(req.body);

  if (!name || !email || !password || !profile.mobile || !profile.country || !profile.pincode || !profile.gender || !profile.age) {
    return res
      .status(400)
      .json({ message: 'name, email, password, mobile, country, pincode, gender, and age are required' });
  }
  if (!['male', 'female'].includes(profile.gender)) {
    return res.status(400).json({ message: 'gender must be either male or female' });
  }
  if (!Number.isInteger(profile.age) || profile.age < 13 || profile.age > 120) {
    return res.status(400).json({ message: 'age must be a valid number between 13 and 120' });
  }

  const db = readDb();
  const userExists = db.users.some((item) => item.email.toLowerCase() === email.toLowerCase());

  if (userExists) {
    return res.status(409).json({ message: 'Email is already registered' });
  }

  const otp = createOtp();
  const passwordHash = await bcrypt.hash(password, 10);

  writeDb((state) => {
    state.otpRequests = state.otpRequests.filter(
      (item) => !(item.email.toLowerCase() === email.toLowerCase() && item.type === 'signup')
    );
    state.otpRequests.push({
      id: createId('otp'),
      email,
      type: 'signup',
      otp,
      payload: {
        name,
        email,
        passwordHash,
        mobile: profile.mobile,
        country: profile.country,
        pincode: profile.pincode,
        gender: profile.gender,
        age: profile.age,
      },
      expiresAt: Date.now() + 10 * 60 * 1000,
      createdAt: new Date().toISOString(),
    });
  });

  await sendEmail({
    to: email,
    subject: 'HEMBIT verification code',
    html: `<p>Your HEMBIT OTP is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
  });

  return res.json({ message: 'OTP sent to your email' });
});

authRouter.post('/signup/verify', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'email and otp are required' });
  }

  const db = readDb();
  const otpRecord = db.otpRequests.find(
    (item) =>
      item.email.toLowerCase() === email.toLowerCase() &&
      item.type === 'signup' &&
      item.otp === otp &&
      item.expiresAt > Date.now()
  );

  if (!otpRecord) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  let user;
  writeDb((state) => {
    user = {
      id: createId('usr'),
      name: otpRecord.payload.name,
      email: otpRecord.payload.email,
      passwordHash: otpRecord.payload.passwordHash,
      mobile: otpRecord.payload.mobile || '',
      country: otpRecord.payload.country || '',
      pincode: otpRecord.payload.pincode || '',
      gender: otpRecord.payload.gender || '',
      age: Number.isFinite(otpRecord.payload.age) ? otpRecord.payload.age : null,
      role: 'customer',
      isVerified: true,
      addresses: [],
      createdAt: new Date().toISOString(),
    };

    state.users.push(user);
    state.otpRequests = state.otpRequests.filter((item) => item.id !== otpRecord.id);
  });

  const token = createToken(user);
  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      country: user.country,
      pincode: user.pincode,
      gender: user.gender,
      age: user.age,
      role: user.role,
    },
  });
});

authRouter.post('/signin', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  const db = readDb();
  const user = db.users.find((item) => item.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  if (user.banned) {
    return res.status(403).json({ message: 'Your account has been suspended. Contact support for assistance.' });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);

  if (!ok) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = createToken(user);

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile || '',
      country: user.country || '',
      pincode: user.pincode || '',
      gender: user.gender || '',
      age: Number.isFinite(user.age) ? user.age : null,
      role: user.role,
      addresses: user.addresses || [],
    },
  });
});

authRouter.get('/me', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

authRouter.post('/password-reset/start', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'email is required' });
  }

  const db = readDb();
  const user = db.users.find((item) => item.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(404).json({ message: 'No user found with this email' });
  }

  const otp = createOtp();

  writeDb((state) => {
    state.otpRequests = state.otpRequests.filter(
      (item) => !(item.email.toLowerCase() === email.toLowerCase() && item.type === 'password_reset')
    );
    state.otpRequests.push({
      id: createId('otp'),
      email,
      type: 'password_reset',
      otp,
      payload: { userId: user.id },
      expiresAt: Date.now() + 10 * 60 * 1000,
      createdAt: new Date().toISOString(),
    });
  });

  await sendEmail({
    to: email,
    subject: 'HEMBIT password reset code',
    html: `<p>Your password reset OTP is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
  });

  return res.json({ message: 'Password reset OTP sent to email' });
});

authRouter.post('/password-reset/verify', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: 'email, otp, and newPassword are required' });
  }

  const db = readDb();
  const otpRecord = db.otpRequests.find(
    (item) =>
      item.email.toLowerCase() === email.toLowerCase() &&
      item.type === 'password_reset' &&
      item.otp === otp &&
      item.expiresAt > Date.now()
  );

  if (!otpRecord) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  writeDb((state) => {
    const user = state.users.find((item) => item.id === otpRecord.payload.userId);
    if (user) {
      user.passwordHash = passwordHash;
    }
    state.otpRequests = state.otpRequests.filter((item) => item.id !== otpRecord.id);
  });

  return res.json({ message: 'Password updated successfully' });
});

authRouter.post('/address', requireAuth, (req, res) => {
  const { line1, line2, city, state, postalCode, country } = req.body;
  if (!line1 || !city || !state || !postalCode || !country) {
    return res.status(400).json({ message: 'Complete address is required' });
  }

  let newAddress;
  writeDb((db) => {
    const user = db.users.find((item) => item.id === req.user.id);
    if (!user) {
      return;
    }
    newAddress = {
      id: createId('addr'),
      line1,
      line2: line2 || '',
      city,
      state,
      postalCode,
      country,
    };
    user.addresses = user.addresses || [];
    user.addresses.push(newAddress);
  });

  return res.json({ message: 'Address added', address: newAddress });
});

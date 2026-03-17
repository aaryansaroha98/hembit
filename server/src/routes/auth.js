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
    subject: 'HEMBIT — Your Verification Code',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#111;padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:22px;letter-spacing:0.18em;font-weight:600;">HEMBIT</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px 32px 16px;text-align:center;">
            <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#888;">Email Verification</p>
            <h2 style="margin:0 0 24px;font-size:20px;font-weight:600;color:#111;letter-spacing:0.04em;">Verify Your Account</h2>
            <p style="margin:0 0 28px;font-size:14px;line-height:1.7;color:#555;">Welcome to HEMBIT. To complete your registration, please use the verification code below. This code will expire in <strong>10 minutes</strong>.</p>
          </td>
        </tr>
        <!-- OTP Box -->
        <tr>
          <td style="padding:0 32px 32px;text-align:center;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #eee;border-radius:8px;">
              <tr>
                <td style="padding:28px 20px;text-align:center;">
                  <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#888;">Your Verification Code</p>
                  <p style="margin:0;font-size:36px;font-weight:700;letter-spacing:0.3em;color:#111;font-family:'Courier New',monospace;">${otp}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Note -->
        <tr>
          <td style="padding:0 32px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:#999;">If you did not create an account with HEMBIT, please disregard this email. Your security is important to us.</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#111;padding:24px 32px;text-align:center;">
            <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.1em;color:rgba(255,255,255,0.5);text-transform:uppercase;">The House of</p>
            <p style="margin:0;font-size:16px;letter-spacing:0.18em;color:#fff;font-weight:600;">HEMBIT</p>
            <p style="margin:12px 0 0;font-size:11px;color:rgba(255,255,255,0.35);">hembit.in</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
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

  /* Send welcome email (async, don't block response) */
  sendEmail({
    to: user.email,
    subject: 'Welcome to HEMBIT — Your Journey Begins',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#111;padding:36px 32px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:26px;letter-spacing:0.22em;font-weight:600;">HEMBIT</h1>
            <p style="margin:8px 0 0;font-size:11px;letter-spacing:0.14em;color:rgba(255,255,255,0.5);text-transform:uppercase;">Elevate Your Style</p>
          </td>
        </tr>
        <!-- Welcome Section -->
        <tr>
          <td style="padding:40px 40px 20px;text-align:center;">
            <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#b8860b;">Welcome</p>
            <h2 style="margin:0 0 20px;font-size:24px;font-weight:600;color:#111;letter-spacing:0.06em;">Dear ${user.name},</h2>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#555;">Welcome to <strong style="color:#111;">HEMBIT</strong> — where craftsmanship meets contemporary design. We are delighted to have you join our community of individuals who appreciate the finer details in fashion.</p>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#555;">Every piece in our collection is thoughtfully curated to ensure uncompromising quality and timeless elegance. From carefully selected fabrics to precision tailoring, each garment tells a story of dedication and artistry.</p>
          </td>
        </tr>
        <!-- Divider -->
        <tr>
          <td style="padding:0 40px;">
            <hr style="border:0;border-top:1px solid #eee;margin:0;">
          </td>
        </tr>
        <!-- Promise Section -->
        <tr>
          <td style="padding:24px 40px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:12px 0;text-align:center;">
                  <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#888;">Our Promise</p>
                  <p style="margin:0;font-size:13px;line-height:1.7;color:#555;">Premium materials · Artisan craftsmanship · Timeless design</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- CTA -->
        <tr>
          <td style="padding:0 40px 36px;text-align:center;">
            <a href="https://hembit.in" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 40px;font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;border-radius:0;">Start Exploring</a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#111;padding:28px 32px;text-align:center;">
            <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.1em;color:rgba(255,255,255,0.5);text-transform:uppercase;">Thank you for choosing</p>
            <p style="margin:0;font-size:16px;letter-spacing:0.18em;color:#fff;font-weight:600;">HEMBIT</p>
            <p style="margin:14px 0 0;font-size:11px;color:rgba(255,255,255,0.35);">hembit.in</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }).catch(() => { /* silent */ });

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
    subject: 'HEMBIT — Password Reset Code',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#111;padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:22px;letter-spacing:0.18em;font-weight:600;">HEMBIT</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px 32px 16px;text-align:center;">
            <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#888;">Account Security</p>
            <h2 style="margin:0 0 24px;font-size:20px;font-weight:600;color:#111;letter-spacing:0.04em;">Password Reset Request</h2>
            <p style="margin:0 0 28px;font-size:14px;line-height:1.7;color:#555;">We received a request to reset the password for your HEMBIT account. Use the code below to proceed. This code will expire in <strong>10 minutes</strong>.</p>
          </td>
        </tr>
        <!-- OTP Box -->
        <tr>
          <td style="padding:0 32px 32px;text-align:center;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #eee;border-radius:8px;">
              <tr>
                <td style="padding:28px 20px;text-align:center;">
                  <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#888;">Your Reset Code</p>
                  <p style="margin:0;font-size:36px;font-weight:700;letter-spacing:0.3em;color:#111;font-family:'Courier New',monospace;">${otp}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Note -->
        <tr>
          <td style="padding:0 32px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:#999;">If you did not request a password reset, you can safely ignore this email. Your account remains secure.</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#111;padding:24px 32px;text-align:center;">
            <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.1em;color:rgba(255,255,255,0.5);text-transform:uppercase;">The House of</p>
            <p style="margin:0;font-size:16px;letter-spacing:0.18em;color:#fff;font-weight:600;">HEMBIT</p>
            <p style="margin:12px 0 0;font-size:11px;color:rgba(255,255,255,0.35);">hembit.in</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
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
      isDefault: !user.addresses || user.addresses.length === 0,
    };
    user.addresses = user.addresses || [];
    user.addresses.push(newAddress);
  });

  return res.json({ message: 'Address added', address: newAddress });
});

authRouter.put('/address/:id', requireAuth, (req, res) => {
  const addrId = req.params.id;
  const { line1, line2, city, state, postalCode, country, isDefault } = req.body;

  let updated;
  writeDb((db) => {
    const user = db.users.find((item) => item.id === req.user.id);
    if (!user || !user.addresses) return;
    const addr = user.addresses.find((a) => a.id === addrId);
    if (!addr) return;
    if (line1 !== undefined) addr.line1 = line1;
    if (line2 !== undefined) addr.line2 = line2;
    if (city !== undefined) addr.city = city;
    if (state !== undefined) addr.state = state;
    if (postalCode !== undefined) addr.postalCode = postalCode;
    if (country !== undefined) addr.country = country;
    if (isDefault) {
      user.addresses.forEach((a) => { a.isDefault = false; });
      addr.isDefault = true;
    }
    updated = addr;
  });

  if (!updated) return res.status(404).json({ message: 'Address not found' });
  return res.json({ message: 'Address updated', address: updated });
});

authRouter.delete('/address/:id', requireAuth, (req, res) => {
  const addrId = req.params.id;
  writeDb((db) => {
    const user = db.users.find((item) => item.id === req.user.id);
    if (!user) return;
    user.addresses = (user.addresses || []).filter((a) => a.id !== addrId);
  });
  return res.json({ message: 'Address deleted' });
});

authRouter.put('/profile', requireAuth, (req, res) => {
  const { name, mobile, country, pincode, gender, age } = req.body;
  let updated;
  writeDb((db) => {
    const user = db.users.find((item) => item.id === req.user.id);
    if (!user) return;
    if (name !== undefined) user.name = name;
    if (mobile !== undefined) user.mobile = mobile;
    if (country !== undefined) user.country = country;
    if (pincode !== undefined) user.pincode = pincode;
    if (gender !== undefined) user.gender = gender;
    if (age !== undefined) user.age = Number(age);
    updated = {
      id: user.id, name: user.name, email: user.email, mobile: user.mobile || '',
      country: user.country || '', pincode: user.pincode || '', gender: user.gender || '',
      age: Number.isFinite(user.age) ? user.age : null, role: user.role, addresses: user.addresses || [],
    };
  });
  if (!updated) return res.status(404).json({ message: 'User not found' });
  return res.json({ message: 'Profile updated', user: updated });
});

authRouter.put('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters' });
  }

  const db = readDb();
  const user = db.users.find((item) => item.id === req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Current password is incorrect' });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  writeDb((state) => {
    const u = state.users.find((item) => item.id === req.user.id);
    if (u) u.passwordHash = passwordHash;
  });

  return res.json({ message: 'Password updated successfully' });
});

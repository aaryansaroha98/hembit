import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { readDb, writeDb } from '../services/store.js';
import { createId } from '../utils/id.js';
import { sendEmail } from '../services/email.js';

export const adminRouter = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../data/uploads');

function ensureUploadsDir() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

function getExtFromMime(mime) {
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'image/gif') return '.gif';
  if (mime === 'video/mp4') return '.mp4';
  if (mime === 'video/webm') return '.webm';
  if (mime === 'video/quicktime') return '.mov';
  return '';
}

function dedupeEmails(values) {
  const set = new Set();
  const result = [];

  for (const value of values) {
    const email = String(value || '').trim().toLowerCase();
    if (!email || set.has(email)) {
      continue;
    }
    set.add(email);
    result.push(email);
  }

  return result;
}

function getAudienceEmails(db, audience) {
  const userEmails = dedupeEmails(db.users.map((item) => item.email));
  const subscriberEmails = dedupeEmails(db.newsletterSubscribers.map((item) => item.email));

  if (audience === 'users') {
    return userEmails;
  }
  if (audience === 'subscribers') {
    return subscriberEmails;
  }
  if (audience === 'both') {
    return dedupeEmails([...userEmails, ...subscriberEmails]);
  }

  return [];
}

adminRouter.use(requireAuth, requireAdmin);

adminRouter.post('/media/upload', (req, res) => {
  const { filename = '', dataUrl = '' } = req.body;
  if (!dataUrl || typeof dataUrl !== 'string') {
    return res.status(400).json({ message: 'dataUrl is required' });
  }

  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return res.status(400).json({ message: 'Invalid data URL format' });
  }

  const mime = match[1];
  const base64 = match[2];
  const allowed = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
  ];
  if (!allowed.includes(mime)) {
    return res.status(400).json({ message: 'Unsupported file type' });
  }

  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length > 8 * 1024 * 1024) {
    return res.status(400).json({ message: 'File too large (max 8MB)' });
  }

  ensureUploadsDir();
  const sourceExt = path.extname(filename).toLowerCase();
  const ext = sourceExt || getExtFromMime(mime) || '.bin';
  const safeFileName = `${createId('media')}${ext}`;
  const targetPath = path.join(uploadsDir, safeFileName);
  fs.writeFileSync(targetPath, buffer);

  const hostBase = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
  return res.status(201).json({
    url: `${hostBase}/uploads/${safeFileName}`,
    mime,
  });
});

adminRouter.get('/dashboard', (_req, res) => {
  const db = readDb();
  const pendingOrders = db.orders.filter((order) => order.status !== 'Delivered').length;

  res.json({
    metrics: {
      users: db.users.length,
      products: db.products.length,
      categories: db.categories.length,
      orders: db.orders.length,
      pendingOrders,
      subscribers: db.newsletterSubscribers.length,
      hbProductionsPosts: db.hbProductions.length,
    },
  });
});

adminRouter.get('/users', (_req, res) => {
  const db = readDb();
  const users = db.users
    .map((item) => ({
      id: item.id,
      name: item.name || '',
      email: item.email || '',
      mobile: item.mobile || '',
      country: item.country || '',
      pincode: item.pincode || '',
      gender: item.gender || '',
      age: Number.isFinite(item.age) ? item.age : null,
      role: item.role || 'customer',
      isVerified: Boolean(item.isVerified),
      createdAt: item.createdAt || null,
    }))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  res.json({ users, count: users.length });
});

adminRouter.get('/products', (_req, res) => {
  const db = readDb();
  res.json({ products: db.products, categories: db.categories });
});

adminRouter.post('/products', (req, res) => {
  const payload = req.body;

  if (!payload.name || !payload.slug || !payload.categoryId || !payload.seriesId || !payload.price) {
    return res.status(400).json({ message: 'name, slug, categoryId, seriesId, and price are required' });
  }

  let created;
  writeDb((db) => {
    created = {
      id: createId('prd'),
      name: payload.name,
      slug: payload.slug,
      categoryId: payload.categoryId,
      seriesId: payload.seriesId,
      price: Number(payload.price),
      currency: payload.currency || 'INR',
      description: payload.description || '',
      details: payload.details || '',
      images: Array.isArray(payload.images) ? payload.images : [],
      sizes: Array.isArray(payload.sizes) ? payload.sizes : ['S', 'M', 'L', 'XL'],
      stock: Number(payload.stock || 0),
      featured: Boolean(payload.featured),
      createdAt: new Date().toISOString(),
    };

    db.products.unshift(created);
  });

  return res.status(201).json({ product: created });
});

adminRouter.put('/products/:id', (req, res) => {
  const productId = req.params.id;
  const payload = req.body;

  let updated;
  writeDb((db) => {
    const product = db.products.find((item) => item.id === productId);
    if (!product) {
      return;
    }

    Object.assign(product, {
      name: payload.name ?? product.name,
      slug: payload.slug ?? product.slug,
      categoryId: payload.categoryId ?? product.categoryId,
      seriesId: payload.seriesId ?? product.seriesId,
      price: payload.price !== undefined ? Number(payload.price) : product.price,
      currency: payload.currency ?? product.currency,
      description: payload.description ?? product.description,
      details: payload.details ?? product.details,
      images: Array.isArray(payload.images) ? payload.images : product.images,
      sizes: Array.isArray(payload.sizes) ? payload.sizes : product.sizes,
      stock: payload.stock !== undefined ? Number(payload.stock) : product.stock,
      featured: payload.featured !== undefined ? Boolean(payload.featured) : product.featured,
    });

    updated = product;
  });

  if (!updated) {
    return res.status(404).json({ message: 'Product not found' });
  }

  return res.json({ product: updated });
});

adminRouter.delete('/products/:id', (req, res) => {
  const productId = req.params.id;
  writeDb((db) => {
    db.products = db.products.filter((item) => item.id !== productId);
  });

  return res.json({ message: 'Product deleted' });
});

adminRouter.get('/categories', (_req, res) => {
  const db = readDb();
  res.json({ categories: db.categories });
});

adminRouter.post('/categories', (req, res) => {
  const { name, slug } = req.body;
  if (!name || !slug) {
    return res.status(400).json({ message: 'name and slug are required' });
  }

  let category;
  writeDb((db) => {
    category = {
      id: createId('cat'),
      name,
      slug,
      order: db.categories.length + 1,
      series: [],
    };

    db.categories.push(category);
  });

  return res.status(201).json({ category });
});

adminRouter.put('/categories/:id', (req, res) => {
  const { name, slug } = req.body;
  const id = req.params.id;

  let category;
  writeDb((db) => {
    category = db.categories.find((item) => item.id === id);
    if (!category) {
      return;
    }

    category.name = name ?? category.name;
    category.slug = slug ?? category.slug;
  });

  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }

  return res.json({ category });
});

adminRouter.delete('/categories/:id', (req, res) => {
  const id = req.params.id;

  writeDb((db) => {
    db.categories = db.categories.filter((item) => item.id !== id);
    db.products = db.products.filter((item) => item.categoryId !== id);
  });

  return res.json({ message: 'Category deleted' });
});

adminRouter.post('/categories/:id/series', (req, res) => {
  const { name, slug } = req.body;
  const categoryId = req.params.id;

  if (!name || !slug) {
    return res.status(400).json({ message: 'name and slug are required' });
  }

  let addedSeries;
  writeDb((db) => {
    const category = db.categories.find((item) => item.id === categoryId);
    if (!category) {
      return;
    }

    addedSeries = { id: createId('ser'), name, slug };
    category.series.push(addedSeries);
  });

  if (!addedSeries) {
    return res.status(404).json({ message: 'Category not found' });
  }

  return res.status(201).json({ series: addedSeries });
});

adminRouter.delete('/categories/:id/series/:seriesId', (req, res) => {
  const { id, seriesId } = req.params;

  writeDb((db) => {
    const category = db.categories.find((item) => item.id === id);
    if (!category) {
      return;
    }

    category.series = category.series.filter((item) => item.id !== seriesId);
    db.products = db.products.filter((item) => item.seriesId !== seriesId);
  });

  return res.json({ message: 'Series deleted' });
});

adminRouter.get('/slides', (_req, res) => {
  const db = readDb();
  res.json({ slides: db.slides.sort((a, b) => a.order - b.order) });
});

adminRouter.post('/slides', (req, res) => {
  const { title, subtitle, type, url, ctaLabel, ctaLink } = req.body;

  if (!title || !type || !url) {
    return res.status(400).json({ message: 'title, type, and url are required' });
  }

  let slide;
  writeDb((db) => {
    slide = {
      id: createId('slide'),
      title,
      subtitle: subtitle || '',
      type,
      url,
      ctaLabel: ctaLabel || 'Discover',
      ctaLink: ctaLink || '/shop',
      order: db.slides.length + 1,
    };

    db.slides.push(slide);
  });

  return res.status(201).json({ slide });
});

adminRouter.put('/slides/:id', (req, res) => {
  const id = req.params.id;
  const payload = req.body;

  let slide;
  writeDb((db) => {
    slide = db.slides.find((item) => item.id === id);
    if (!slide) {
      return;
    }

    Object.assign(slide, {
      title: payload.title ?? slide.title,
      subtitle: payload.subtitle ?? slide.subtitle,
      type: payload.type ?? slide.type,
      url: payload.url ?? slide.url,
      ctaLabel: payload.ctaLabel ?? slide.ctaLabel,
      ctaLink: payload.ctaLink ?? slide.ctaLink,
      order: payload.order !== undefined ? Number(payload.order) : slide.order,
    });
  });

  if (!slide) {
    return res.status(404).json({ message: 'Slide not found' });
  }

  return res.json({ slide });
});

adminRouter.delete('/slides/:id', (req, res) => {
  const id = req.params.id;

  writeDb((db) => {
    db.slides = db.slides.filter((item) => item.id !== id);
  });

  return res.json({ message: 'Slide deleted' });
});

adminRouter.get('/content', (_req, res) => {
  const db = readDb();
  res.json({ content: db.content });
});

adminRouter.put('/content/:key', (req, res) => {
  const key = req.params.key;
  const allowed = ['about', 'founder', 'privacy', 'terms', 'services'];

  if (!allowed.includes(key)) {
    return res.status(404).json({ message: 'Invalid content key' });
  }

  const { title, body } = req.body;

  writeDb((db) => {
    db.content[key] = {
      title: title ?? db.content[key].title,
      body: body ?? db.content[key].body,
    };
  });

  return res.json({ message: 'Content updated' });
});

adminRouter.get('/settings', (_req, res) => {
  const db = readDb();
  res.json({ settings: db.settings });
});

adminRouter.put('/settings', (req, res) => {
  const incoming = req.body?.serviceContact || {};

  let settings;
  writeDb((db) => {
    db.settings = db.settings || {};
    const current = db.settings.serviceContact || {};

    db.settings.serviceContact = {
      supportEmail: incoming.supportEmail ?? current.supportEmail ?? '',
      contactNumber: incoming.contactNumber ?? current.contactNumber ?? '',
      contactHours: incoming.contactHours ?? current.contactHours ?? '',
    };

    settings = db.settings;
  });

  return res.json({ message: 'Settings updated', settings });
});

adminRouter.get('/hb-productions', (_req, res) => {
  const db = readDb();
  res.json({ posts: db.hbProductions });
});

adminRouter.post('/hb-productions', (req, res) => {
  const { title, excerpt, image, body } = req.body;
  if (!title || !body) {
    return res.status(400).json({ message: 'title and body are required' });
  }

  let post;
  writeDb((db) => {
    post = {
      id: createId('blog'),
      title,
      excerpt: excerpt || '',
      image: image || '',
      body,
      createdAt: new Date().toISOString(),
    };
    db.hbProductions.unshift(post);
  });

  return res.status(201).json({ post });
});

adminRouter.delete('/hb-productions/:id', (req, res) => {
  const id = req.params.id;

  writeDb((db) => {
    db.hbProductions = db.hbProductions.filter((item) => item.id !== id);
  });

  return res.json({ message: 'HB production post deleted' });
});

adminRouter.get('/orders', (_req, res) => {
  const db = readDb();
  res.json({ orders: db.orders });
});

adminRouter.put('/orders/:id/status', (req, res) => {
  const id = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: 'status is required' });
  }

  let updated;
  writeDb((db) => {
    const order = db.orders.find((item) => item.id === id);
    if (!order) {
      return;
    }

    order.status = status;
    order.updatedAt = new Date().toISOString();
    order.timeline.push({ status, at: order.updatedAt });
    updated = order;
  });

  if (!updated) {
    return res.status(404).json({ message: 'Order not found' });
  }

  return res.json({ order: updated });
});

adminRouter.get('/mail/recipients', (_req, res) => {
  const db = readDb();
  const userEmails = getAudienceEmails(db, 'users');
  const subscriberEmails = getAudienceEmails(db, 'subscribers');
  const all = dedupeEmails([...userEmails, ...subscriberEmails]);

  return res.json({
    recipients: {
      users: userEmails,
      subscribers: subscriberEmails,
      both: all,
    },
    counts: {
      users: userEmails.length,
      subscribers: subscriberEmails.length,
      both: all.length,
    },
  });
});

adminRouter.post('/mail/send', async (req, res) => {
  const { subject, body, audience = 'both' } = req.body;

  if (!subject || !body) {
    return res.status(400).json({ message: 'subject and body are required' });
  }
  if (!['users', 'subscribers', 'both'].includes(audience)) {
    return res.status(400).json({ message: 'audience must be users, subscribers, or both' });
  }

  const db = readDb();
  const recipients = getAudienceEmails(db, audience);

  if (!recipients.length) {
    return res.status(400).json({ message: `No recipients found for audience: ${audience}` });
  }

  const failures = [];
  for (const email of recipients) {
    try {
      await sendEmail({
        to: email,
        subject,
        html: `<p>${body}</p>`,
      });
    } catch (error) {
      failures.push({ email, error: error.message });
    }
  }

  writeDb((state) => {
    state.mailLogs.unshift({
      id: createId('mail'),
      subject,
      body,
      audience,
      recipientCount: recipients.length,
      sentCount: recipients.length - failures.length,
      failedCount: failures.length,
      sentAt: new Date().toISOString(),
    });
  });

  if (failures.length) {
    return res.status(207).json({
      message: `Mail sent to ${recipients.length - failures.length}/${recipients.length} recipients`,
      sentCount: recipients.length - failures.length,
      failedCount: failures.length,
      failures: failures.slice(0, 20),
    });
  }

  return res.json({
    message: `Mail sent to ${recipients.length} recipients`,
    sentCount: recipients.length,
    failedCount: 0,
  });
});

adminRouter.get('/newsletter', (_req, res) => {
  const db = readDb();
  res.json({ subscribers: db.newsletterSubscribers, mails: db.mailLogs });
});

adminRouter.post('/newsletter/send', async (req, res) => {
  const { subject, body } = req.body;
  if (!subject || !body) {
    return res.status(400).json({ message: 'subject and body are required' });
  }

  const db = readDb();
  const subscribers = db.newsletterSubscribers;

  for (const subscriber of subscribers) {
    await sendEmail({
      to: subscriber.email,
      subject,
      html: `<p>${body}</p>`,
    });
  }

  writeDb((state) => {
    state.mailLogs.unshift({
      id: createId('mail'),
      subject,
      body,
      recipientCount: subscribers.length,
      sentAt: new Date().toISOString(),
    });
  });

  return res.json({ message: `Newsletter sent to ${subscribers.length} subscribers` });
});

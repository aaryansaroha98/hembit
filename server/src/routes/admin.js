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
      tag: item.tag || '',
      banned: Boolean(item.banned),
      isVerified: Boolean(item.isVerified),
      createdAt: item.createdAt || null,
    }))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  res.json({ users, count: users.length });
});

/* ── User Management: make admin, ban, tag ── */
adminRouter.put('/users/:id/role', (req, res) => {
  const { role } = req.body;
  if (!['customer', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'role must be customer or admin' });
  }

  let updated;
  writeDb((db) => {
    const user = db.users.find((u) => u.id === req.params.id);
    if (user) {
      user.role = role;
      updated = user;
    }
  });

  if (!updated) return res.status(404).json({ message: 'User not found' });
  return res.json({ message: `User role set to ${role}`, user: updated });
});

adminRouter.put('/users/:id/ban', (req, res) => {
  const { banned } = req.body;

  let updated;
  writeDb((db) => {
    const user = db.users.find((u) => u.id === req.params.id);
    if (user) {
      user.banned = Boolean(banned);
      user.bannedAt = banned ? new Date().toISOString() : null;
      updated = user;
    }
  });

  if (!updated) return res.status(404).json({ message: 'User not found' });
  return res.json({ message: banned ? 'User banned' : 'User unbanned', user: updated });
});

adminRouter.put('/users/:id/tag', (req, res) => {
  const { tag } = req.body;

  let updated;
  writeDb((db) => {
    const user = db.users.find((u) => u.id === req.params.id);
    if (user) {
      user.tag = String(tag || '').trim();
      updated = user;
    }
  });

  if (!updated) return res.status(404).json({ message: 'User not found' });
  return res.json({ message: 'Tag updated', user: updated });
});

adminRouter.get('/products', (_req, res) => {
  const db = readDb();
  res.json({ products: db.products, categories: db.categories });
});

adminRouter.post('/products', (req, res) => {
  const payload = req.body;

  if (!payload.name || !payload.categoryId || !payload.seriesId || !payload.price) {
    return res.status(400).json({ message: 'name, categoryId, seriesId, and price are required' });
  }

  const autoSlug = payload.slug
    ? payload.slug
    : payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);

  let created;
  writeDb((db) => {
    created = {
      id: createId('prd'),
      name: payload.name,
      slug: autoSlug,
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
  const { title, subtitle, type, url, ctaLabel, ctaLink, productIds, layout } = req.body;

  if (type === 'products') {
    if (!Array.isArray(productIds) || productIds.length < 1) {
      return res.status(400).json({ message: 'productIds array is required for product slides' });
    }
  } else {
    if (!type || !url) {
      return res.status(400).json({ message: 'type and url are required' });
    }
  }

  let slide;
  writeDb((db) => {
    slide = {
      id: createId('slide'),
      title: title || '',
      subtitle: subtitle || '',
      type: type || 'image',
      url: url || '',
      ctaLabel: ctaLabel || '',
      ctaLink: ctaLink || '',
      productIds: type === 'products' ? productIds : [],
      layout: type === 'products' ? (Number(layout) || 2) : 0,
      order: db.slides.length + 1,
    };

    db.slides.push(slide);
  });

  return res.status(201).json({ slide });
});

adminRouter.put('/slides/reorder', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ message: 'ids array is required' });
  }
  writeDb((db) => {
    ids.forEach((id, index) => {
      const slide = db.slides.find((s) => s.id === id);
      if (slide) slide.order = index + 1;
    });
  });
  return res.json({ message: 'Slides reordered' });
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
      productIds: payload.productIds ?? slide.productIds ?? [],
      layout: payload.layout !== undefined ? Number(payload.layout) : (slide.layout ?? 0),
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

/* ── Send order status email ── */
adminRouter.post('/orders/:id/send-status-email', async (req, res) => {
  const id = req.params.id;
  const db = readDb();
  const order = db.orders.find((item) => item.id === id);

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  const email = order.customer?.email;
  if (!email) {
    return res.status(400).json({ message: 'No customer email on order' });
  }

  const itemRows = (order.items || []).map((item) =>
    `<tr>
      <td style="padding:12px 16px;border-bottom:1px solid #e5e5e5;font-size:14px;color:#333;">${item.name}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #e5e5e5;font-size:14px;color:#333;text-align:center;">${item.size || '-'}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #e5e5e5;font-size:14px;color:#333;text-align:center;">${item.quantity}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #e5e5e5;font-size:14px;color:#333;text-align:right;">₹${Number(item.lineTotal || item.price * item.quantity).toLocaleString('en-IN')}</td>
    </tr>`
  ).join('');

  const statusColor = order.status === 'Delivered' ? '#0a7c42' : order.status === 'Shipped' ? '#1a6dd4' : order.status === 'Out for Delivery' ? '#b45309' : order.status === 'Confirmed' ? '#111' : '#555';

  const statusMessages = {
    'Pending Confirmation': {
      heading: 'We\'ve Received Your Order',
      body: 'Thank you for placing your order with HEMBIT. We are currently reviewing your order and will confirm it shortly. You will receive an update once your order is confirmed.',
    },
    'Payment Successful': {
      heading: 'Payment Confirmed',
      body: 'Your payment has been successfully processed. We are now preparing your order with the utmost care and attention to detail.',
    },
    'Confirmed': {
      heading: 'Your Order is Confirmed',
      body: 'Great news — your order has been confirmed and is being prepared for dispatch. Our team is ensuring everything is perfect before it leaves our hands.',
    },
    'Shipped': {
      heading: 'Your Order is On Its Way',
      body: 'Your order has been shipped and is on its way to you. Keep an eye on your inbox for tracking updates as your order makes its journey.',
    },
    'Out for Delivery': {
      heading: 'Almost There',
      body: 'Your order is out for delivery and will arrive shortly. Please ensure someone is available to receive your package.',
    },
    'Delivered': {
      heading: 'Thank You for Shopping with Us',
      body: 'Your order has been delivered. We hope you love your purchase as much as we enjoyed curating it for you. Your style, elevated — that\'s the HEMBIT promise.',
    },
    'Cancelled': {
      heading: 'Order Cancelled',
      body: 'Your order has been cancelled. If a payment was made, the refund will be processed within 5–7 business days. We hope to serve you again soon.',
    },
  };

  const msg = statusMessages[order.status] || { heading: 'Order Update', body: `Your order status has been updated to ${order.status}.` };

  const html = `
<!DOCTYPE html>
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
        <!-- Status Banner -->
        <tr>
          <td style="padding:32px 32px 24px;text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#888;">Order Status Update</p>
            <h2 style="margin:0;font-size:26px;font-weight:600;color:${statusColor};letter-spacing:0.04em;text-transform:uppercase;">${order.status}</h2>
          </td>
        </tr>
        <!-- Order Details -->
        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #eee;border-radius:6px;">
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #eee;">
                  <span style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#888;">Order Number</span><br>
                  <strong style="font-size:14px;color:#111;">${order.id}</strong>
                </td>
                <td style="padding:16px 20px;border-bottom:1px solid #eee;text-align:right;">
                  <span style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#888;">Date</span><br>
                  <strong style="font-size:14px;color:#111;">${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding:16px 20px;">
                  <span style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#888;">Delivered To</span><br>
                  <strong style="font-size:14px;color:#111;">${order.customer?.name || 'Customer'}</strong>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Items Table -->
        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:6px;overflow:hidden;">
              <thead>
                <tr style="background:#111;">
                  <th style="padding:12px 16px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#fff;text-align:left;font-weight:500;">Item</th>
                  <th style="padding:12px 16px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#fff;text-align:center;font-weight:500;">Size</th>
                  <th style="padding:12px 16px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#fff;text-align:center;font-weight:500;">Qty</th>
                  <th style="padding:12px 16px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#fff;text-align:right;font-weight:500;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemRows}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding:14px 16px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#111;">Total</td>
                  <td style="padding:14px 16px;font-size:15px;font-weight:700;color:#111;text-align:right;">₹${Number(order.total).toLocaleString('en-IN')}</td>
                </tr>
              </tfoot>
            </table>
          </td>
        </tr>
        <!-- Message -->
        <tr>
          <td style="padding:0 32px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #eee;border-radius:6px;">
              <tr>
                <td style="padding:24px 28px;">
                  <h3 style="margin:0 0 10px;font-size:16px;font-weight:600;color:#111;letter-spacing:0.02em;">${msg.heading}</h3>
                  <p style="margin:0;font-size:14px;line-height:1.7;color:#555;">${msg.body}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#111;padding:24px 32px;text-align:center;">
            <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.12em;color:rgba(255,255,255,0.6);text-transform:uppercase;">Thank you for shopping with</p>
            <p style="margin:0;font-size:16px;letter-spacing:0.18em;color:#fff;font-weight:600;">HEMBIT</p>
            <p style="margin:12px 0 0;font-size:11px;color:rgba(255,255,255,0.4);">hembit.in</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await sendEmail({
      to: email,
      subject: `HEMBIT — Order ${order.id} is now ${order.status}`,
      html,
    });
    return res.json({ message: `Status email sent to ${email}` });
  } catch (error) {
    return res.status(500).json({ message: `Failed to send email: ${error.message}` });
  }
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

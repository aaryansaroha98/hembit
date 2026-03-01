import { Router } from 'express';
import { readDb, writeDb } from '../services/store.js';
import { createId } from '../utils/id.js';
import { sendEmail } from '../services/email.js';

export const publicRouter = Router();

function formatCurrency(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function withDerivedProduct(db, product) {
  const category = db.categories.find((cat) => cat.id === product.categoryId);
  const series = category?.series.find((ser) => ser.id === product.seriesId);

  return {
    ...product,
    displayPrice: formatCurrency(product.price, product.currency),
    categoryName: category?.name || 'Uncategorized',
    seriesName: series?.name || 'General',
  };
}

publicRouter.get('/home', (req, res) => {
  const db = readDb();

  const slides = [...db.slides].sort((a, b) => a.order - b.order).map((slide) => {
    if (slide.type === 'products' && Array.isArray(slide.productIds)) {
      return {
        ...slide,
        products: slide.productIds
          .map((pid) => db.products.find((p) => p.id === pid))
          .filter(Boolean)
          .map((p) => withDerivedProduct(db, p)),
      };
    }
    return slide;
  });
  const featuredProducts = db.products
    .filter((item) => item.featured)
    .slice(0, 8)
    .map((item) => withDerivedProduct(db, item));

  res.json({
    slides,
    featuredProducts,
    topNavigation: {
      left: ['HIGHLIGHTS', 'MEN', 'HB PRODUCTIONS'],
      right: ['CART', 'SERVICES', 'LOGIN', 'SEARCH'],
      logo: 'HEMBIT',
    },
  });
});

publicRouter.get('/navigation', (req, res) => {
  const db = readDb();

  const menu = db.categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    series: category.series,
  }));

  res.json({
    highlights: menu,
    men: menu,
    hbProductionsCount: db.hbProductions.length,
  });
});

publicRouter.get('/shop', (req, res) => {
  const db = readDb();
  const { category, series, search } = req.query;

  let result = db.products;

  if (category) {
    const matched = db.categories.find(
      (item) => item.slug === String(category) || item.id === String(category)
    );
    if (matched) {
      result = result.filter((item) => item.categoryId === matched.id);
    }
  }

  if (series) {
    const seriesSlug = String(series);
    const categoryMap = new Map();
    db.categories.forEach((cat) => {
      cat.series.forEach((ser) => categoryMap.set(ser.slug, ser.id));
    });
    const matchedSeriesId = categoryMap.get(seriesSlug) || seriesSlug;
    result = result.filter((item) => item.seriesId === matchedSeriesId);
  }

  if (search) {
    const term = String(search).toLowerCase();
    result = result.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.details.toLowerCase().includes(term)
    );
  }

  res.json({
    products: result.map((item) => withDerivedProduct(db, item)),
    categories: db.categories,
  });
});

publicRouter.get('/product/:slug', (req, res) => {
  const db = readDb();
  const slug = req.params.slug;
  const product = db.products.find((item) => item.slug === slug || item.id === slug);

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  return res.json({ product: withDerivedProduct(db, product) });
});

publicRouter.get('/content/:key', (req, res) => {
  const db = readDb();
  const key = req.params.key;
  const allowed = ['about', 'founder', 'privacy', 'terms', 'services'];

  if (!allowed.includes(key)) {
    return res.status(404).json({ message: 'Content not found' });
  }

  return res.json({ content: db.content[key] });
});

publicRouter.get('/settings', (_req, res) => {
  const db = readDb();
  res.json({ settings: db.settings });
});

publicRouter.get('/hb-productions', (req, res) => {
  const db = readDb();
  res.json({ posts: db.hbProductions });
});

publicRouter.post('/newsletter/subscribe', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  let isNew = false;
  writeDb((db) => {
    const exists = db.newsletterSubscribers.some((item) => item.email === email);
    if (!exists) {
      isNew = true;
      db.newsletterSubscribers.push({
        id: createId('nws'),
        email,
        subscribedAt: new Date().toISOString(),
      });
    }
  });

  if (isNew) {
    const welcomeHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;max-width:600px;width:100%;">
        <tr>
          <td style="background:#111;padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:22px;letter-spacing:0.18em;font-weight:600;">HEMBIT</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:48px 40px 20px;text-align:center;">
            <h2 style="margin:0 0 8px;font-size:24px;font-weight:600;color:#111;letter-spacing:0.03em;">Welcome to HEMBIT</h2>
            <p style="margin:0;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;color:#999;">You're now on the list</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 40px 40px;text-align:center;">
            <p style="margin:0 0 20px;font-size:15px;line-height:1.8;color:#555;">Thank you for subscribing. You'll be the first to know about new collections, exclusive drops, and everything HEMBIT.</p>
            <p style="margin:0;font-size:15px;line-height:1.8;color:#555;">Style isn't just what you wear — it's how you carry yourself. We're here to make sure you do it right.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 40px;text-align:center;">
            <a href="https://hembit.in" style="display:inline-block;background:#111;color:#fff;padding:14px 40px;font-size:13px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;border-radius:0;">Explore Now</a>
          </td>
        </tr>
        <tr>
          <td style="background:#111;padding:24px 32px;text-align:center;">
            <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.12em;color:rgba(255,255,255,0.6);text-transform:uppercase;">Elevate your style with</p>
            <p style="margin:0;font-size:16px;letter-spacing:0.18em;color:#fff;font-weight:600;">HEMBIT</p>
            <p style="margin:12px 0 0;font-size:11px;color:rgba(255,255,255,0.4);">hembit.in</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    sendEmail({
      to: email,
      subject: 'Welcome to HEMBIT — You\'re In',
      html: welcomeHtml,
    }).catch(() => {});
  }

  return res.json({ message: 'Subscribed successfully' });
});

publicRouter.get('/track-order', (req, res) => {
  const db = readDb();
  const { orderId, email } = req.query;

  if (!orderId || !email) {
    return res.status(400).json({ message: 'orderId and email are required' });
  }

  const order = db.orders.find(
    (item) => item.id === orderId && item.customer?.email?.toLowerCase() === String(email).toLowerCase()
  );

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  return res.json({
    order: {
      id: order.id,
      status: order.status,
      items: order.items,
      total: order.total,
      timeline: order.timeline,
      createdAt: order.createdAt,
    },
  });
});

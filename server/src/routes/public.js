import { Router } from 'express';
import { readDb, writeDb } from '../services/store.js';
import { createId } from '../utils/id.js';

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

  writeDb((db) => {
    const exists = db.newsletterSubscribers.some((item) => item.email === email);
    if (!exists) {
      db.newsletterSubscribers.push({
        id: createId('nws'),
        email,
        subscribedAt: new Date().toISOString(),
      });
    }
  });

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

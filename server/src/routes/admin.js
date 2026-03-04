import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { readDb, writeDb } from '../services/store.js';
import { createId } from '../utils/id.js';
import { sendEmail } from '../services/email.js';
import { uploadToCloudinary } from '../services/cloudinary.js';

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

function normalizeHexColor(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return { value: '', valid: true };
  }

  const normalized = raw.startsWith('#') ? raw : `#${raw}`;
  const isValid = /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(normalized);

  return { value: normalized.toUpperCase(), valid: isValid };
}

const LEGACY_SLIDE_TITLE_SIZES = new Set(['small', 'medium', 'large']);
const ALLOWED_SLIDE_TITLE_POSITIONS = new Set([
  'bottom-left',
  'bottom-center',
  'bottom-right',
  'middle-left',
  'middle-center',
  'middle-right',
  'top-left',
  'top-center',
  'top-right',
]);
const MIN_SLIDE_TITLE_SIZE_PX = 5;
const MAX_SLIDE_TITLE_SIZE_PX = 120;
const MIN_PRODUCT_SLIDE_LAYOUT = 1;
const MAX_PRODUCT_SLIDE_LAYOUT = 3;

function normalizeSlideTitleSize(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) {
    return { value: '72px', valid: true };
  }

  if (LEGACY_SLIDE_TITLE_SIZES.has(raw)) {
    return { value: raw, valid: true };
  }

  const match = raw.match(/^(\d{1,3})(?:px)?$/);
  if (!match) {
    return { value: '72px', valid: false };
  }

  const sizePx = Number(match[1]);
  const valid = Number.isInteger(sizePx) && sizePx >= MIN_SLIDE_TITLE_SIZE_PX && sizePx <= MAX_SLIDE_TITLE_SIZE_PX;
  return {
    value: `${sizePx}px`,
    valid,
  };
}

function normalizeSlideTitlePosition(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) {
    return { value: 'bottom-left', valid: true };
  }

  return {
    value: ALLOWED_SLIDE_TITLE_POSITIONS.has(raw) ? raw : 'bottom-left',
    valid: ALLOWED_SLIDE_TITLE_POSITIONS.has(raw),
  };
}

function normalizeProductSlideLayout(value, strict = false) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return { value: 2, valid: !strict };
  }

  if (parsed < MIN_PRODUCT_SLIDE_LAYOUT || parsed > MAX_PRODUCT_SLIDE_LAYOUT) {
    return {
      value: Math.min(MAX_PRODUCT_SLIDE_LAYOUT, Math.max(MIN_PRODUCT_SLIDE_LAYOUT, parsed)),
      valid: !strict,
    };
  }

  return { value: parsed, valid: true };
}

function normalizeSlideProductIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();
  const ids = [];
  value.forEach((item) => {
    const id = String(item || '').trim();
    if (!id || seen.has(id)) {
      return;
    }
    seen.add(id);
    ids.push(id);
  });
  return ids;
}

function normalizeSlideCategoryCards(value) {
  if (!Array.isArray(value)) {
    return { cards: [], hasIncomplete: false, hasDuplicates: false };
  }

  const seen = new Set();
  const cards = [];
  let hasIncomplete = false;
  let hasDuplicates = false;

  value.forEach((item) => {
    const categoryId = String(item?.categoryId || '').trim();
    const imageUrl = String(item?.imageUrl || '').trim();

    if (!categoryId && !imageUrl) {
      return;
    }
    if (!categoryId || !imageUrl) {
      hasIncomplete = true;
      return;
    }
    if (seen.has(categoryId)) {
      hasDuplicates = true;
      return;
    }

    seen.add(categoryId);
    cards.push({ categoryId, imageUrl });
  });

  return { cards, hasIncomplete, hasDuplicates };
}

function normalizeSlideSeriesCards(value) {
  if (!Array.isArray(value)) {
    return { cards: [], hasIncomplete: false, hasDuplicates: false };
  }

  const seen = new Set();
  const cards = [];
  let hasIncomplete = false;
  let hasDuplicates = false;

  value.forEach((item) => {
    const seriesId = String(item?.seriesId || '').trim();
    const imageUrl = String(item?.imageUrl || '').trim();

    if (!seriesId && !imageUrl) {
      return;
    }
    if (!seriesId || !imageUrl) {
      hasIncomplete = true;
      return;
    }
    if (seen.has(seriesId)) {
      hasDuplicates = true;
      return;
    }

    seen.add(seriesId);
    cards.push({ seriesId, imageUrl });
  });

  return { cards, hasIncomplete, hasDuplicates };
}

function validateProductSlideContent(db, productIds, categoryCards, seriesCards, layout) {
  const missingProductIds = productIds.filter((id) => !db.products.some((item) => item.id === id));
  if (missingProductIds.length) {
    return `Unknown productIds: ${missingProductIds.join(', ')}`;
  }

  const missingCategoryIds = categoryCards
    .map((item) => item.categoryId)
    .filter((id) => !db.categories.some((item) => item.id === id));
  if (missingCategoryIds.length) {
    return `Unknown categoryIds: ${missingCategoryIds.join(', ')}`;
  }

  const allSeriesIds = new Set(
    db.categories.flatMap((category) => category.series.map((item) => item.id))
  );
  const missingSeriesIds = seriesCards
    .map((item) => item.seriesId)
    .filter((id) => !allSeriesIds.has(id));
  if (missingSeriesIds.length) {
    return `Unknown seriesIds: ${missingSeriesIds.join(', ')}`;
  }

  const totalCards = productIds.length + categoryCards.length + seriesCards.length;
  if (totalCards < 1) {
    return 'Select at least 1 product, category, or series for product slides';
  }

  if (totalCards > layout) {
    return `Total selected products + categories + series cannot exceed layout (${layout})`;
  }

  return '';
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

adminRouter.post('/media/upload', async (req, res) => {
  const { dataUrl = '' } = req.body;
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
  if (buffer.length > 10 * 1024 * 1024) {
    return res.status(400).json({ message: 'File too large (max 10MB)' });
  }

  try {
    const result = await uploadToCloudinary(dataUrl);
    return res.status(201).json({ url: result.url, mime: result.mime });
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    return res.status(500).json({ message: 'Upload failed' });
  }
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
  const isAvailable = payload.isAvailable !== undefined ? Boolean(payload.isAvailable) : true;
  const unavailableButtonText =
    typeof payload.unavailableButtonText === 'string' ? payload.unavailableButtonText.trim() : '';
  const priceValue = Number(payload.price);

  if (!payload.name || !payload.categoryId || !payload.seriesId) {
    return res.status(400).json({ message: 'name, categoryId, and seriesId are required' });
  }

  if (isAvailable) {
    if (payload.price === undefined || payload.price === null || payload.price === '' || !Number.isFinite(priceValue)) {
      return res.status(400).json({ message: 'price is required when product is available' });
    }
  } else if (!unavailableButtonText) {
    return res
      .status(400)
      .json({ message: 'unavailableButtonText is required when product is not available' });
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
      price: Number.isFinite(priceValue) ? priceValue : 0,
      currency: payload.currency || 'INR',
      description: payload.description || '',
      details: payload.details || '',
      careInstructions: payload.careInstructions || '',
      images: Array.isArray(payload.images) ? payload.images : [],
      sizes: Array.isArray(payload.sizes) ? payload.sizes : ['S', 'M', 'L', 'XL'],
      stock: Number(payload.stock || 0),
      featured: Boolean(payload.featured),
      isAvailable,
      unavailableButtonText: isAvailable ? '' : unavailableButtonText,
      createdAt: new Date().toISOString(),
    };

    db.products.unshift(created);
  });

  return res.status(201).json({ product: created });
});

adminRouter.put('/products/:id', (req, res) => {
  const productId = req.params.id;
  const payload = req.body;
  const payloadHasPrice = payload.price !== undefined;
  const parsedPrice = payloadHasPrice ? Number(payload.price) : null;
  const payloadIsAvailable = payload.isAvailable !== undefined ? Boolean(payload.isAvailable) : undefined;
  const payloadUnavailableButtonText =
    typeof payload.unavailableButtonText === 'string' ? payload.unavailableButtonText.trim() : undefined;

  let updated;
  writeDb((db) => {
    const product = db.products.find((item) => item.id === productId);
    if (!product) {
      return;
    }

    const nextIsAvailable = payloadIsAvailable !== undefined ? payloadIsAvailable : product.isAvailable !== false;
    const existingButtonText =
      typeof product.unavailableButtonText === 'string' && product.unavailableButtonText.trim()
        ? product.unavailableButtonText.trim()
        : 'Currently Unavailable';
    const nextUnavailableButtonText =
      payloadUnavailableButtonText !== undefined ? payloadUnavailableButtonText : existingButtonText;
    const nextPrice = payloadHasPrice ? parsedPrice : product.price;

    if (nextIsAvailable && !Number.isFinite(nextPrice)) {
      return;
    }

    if (!nextIsAvailable && !nextUnavailableButtonText) {
      return;
    }

    Object.assign(product, {
      name: payload.name ?? product.name,
      slug: payload.slug ?? product.slug,
      categoryId: payload.categoryId ?? product.categoryId,
      seriesId: payload.seriesId ?? product.seriesId,
      price: nextPrice,
      currency: payload.currency ?? product.currency,
      description: payload.description ?? product.description,
      details: payload.details ?? product.details,
      careInstructions: payload.careInstructions ?? product.careInstructions ?? '',
      images: Array.isArray(payload.images) ? payload.images : product.images,
      sizes: Array.isArray(payload.sizes) ? payload.sizes : product.sizes,
      stock: payload.stock !== undefined ? Number(payload.stock) : product.stock,
      featured: payload.featured !== undefined ? Boolean(payload.featured) : product.featured,
      isAvailable: nextIsAvailable,
      unavailableButtonText: nextIsAvailable ? '' : nextUnavailableButtonText,
    });

    updated = product;
  });

  if (!updated) {
    if (payloadHasPrice && !Number.isFinite(parsedPrice)) {
      return res.status(400).json({ message: 'price must be a valid number' });
    }
    if (payloadIsAvailable === false && payloadUnavailableButtonText === '') {
      return res
        .status(400)
        .json({ message: 'unavailableButtonText is required when product is not available' });
    }
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

adminRouter.put('/categories/:id/series/:seriesId', (req, res) => {
  const { id, seriesId } = req.params;
  const { name, slug } = req.body;

  if (typeof name === 'undefined' && typeof slug === 'undefined') {
    return res.status(400).json({ message: 'name or slug is required' });
  }

  if (typeof name !== 'undefined' && !name) {
    return res.status(400).json({ message: 'name cannot be empty' });
  }

  if (typeof slug !== 'undefined' && !slug) {
    return res.status(400).json({ message: 'slug cannot be empty' });
  }

  let categoryFound = false;
  let updatedSeries = null;
  writeDb((db) => {
    const category = db.categories.find((item) => item.id === id);
    if (!category) {
      return;
    }
    categoryFound = true;

    const series = category.series.find((item) => item.id === seriesId);
    if (!series) {
      return;
    }

    if (typeof name !== 'undefined') {
      series.name = name;
    }
    if (typeof slug !== 'undefined') {
      series.slug = slug;
    }

    updatedSeries = series;
  });

  if (!categoryFound) {
    return res.status(404).json({ message: 'Category not found' });
  }

  if (!updatedSeries) {
    return res.status(404).json({ message: 'Series not found' });
  }

  return res.json({ series: updatedSeries });
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
  const {
    title,
    subtitle,
    type,
    url,
    ctaLabel,
    ctaLink,
    topbarLinkColor,
    fontColor,
    productIds,
    categoryCards,
    seriesCards,
    layout,
    titleSize,
    titlePosition,
  } = req.body;
  const hasLayout = Object.prototype.hasOwnProperty.call(req.body || {}, 'layout');
  const parsedTopbarColor = normalizeHexColor(topbarLinkColor);
  const parsedFontColor = normalizeHexColor(fontColor);
  const parsedTitleSize = normalizeSlideTitleSize(titleSize);
  const parsedTitlePosition = normalizeSlideTitlePosition(titlePosition);

  if (!parsedTopbarColor.valid) {
    return res.status(400).json({ message: 'topbarLinkColor must be a valid hex color' });
  }
  if (!parsedFontColor.valid) {
    return res.status(400).json({ message: 'fontColor must be a valid hex color' });
  }
  if (!parsedTitleSize.valid) {
    return res.status(400).json({
      message: `titleSize must be a px value between ${MIN_SLIDE_TITLE_SIZE_PX}px and ${MAX_SLIDE_TITLE_SIZE_PX}px (legacy small/medium/large also supported)`,
    });
  }
  if (!parsedTitlePosition.valid) {
    return res.status(400).json({
      message: 'titlePosition must be one of: bottom-left, bottom-center, bottom-right, middle-left, middle-center, middle-right, top-left, top-center, top-right',
    });
  }

  const isProductSlide = type === 'products';
  const layoutResult = normalizeProductSlideLayout(layout, isProductSlide && hasLayout);
  if (isProductSlide && !layoutResult.valid) {
    return res.status(400).json({ message: 'layout must be one of: 1, 2, 3 for product slides' });
  }

  if (isProductSlide) {
    if (productIds !== undefined && !Array.isArray(productIds)) {
      return res.status(400).json({ message: 'productIds must be an array for product slides' });
    }
    if (categoryCards !== undefined && !Array.isArray(categoryCards)) {
      return res.status(400).json({ message: 'categoryCards must be an array for product slides' });
    }
    if (seriesCards !== undefined && !Array.isArray(seriesCards)) {
      return res.status(400).json({ message: 'seriesCards must be an array for product slides' });
    }
  } else {
    if (!type || !url) {
      return res.status(400).json({ message: 'type and url are required' });
    }
  }

  let slide;
  writeDb((db) => {
    const normalizedProductIds = normalizeSlideProductIds(productIds);
    const parsedCategoryCards = normalizeSlideCategoryCards(categoryCards);
    const parsedSeriesCards = normalizeSlideSeriesCards(seriesCards);

    if (isProductSlide && parsedCategoryCards.hasIncomplete) {
      slide = { __error: 'Each category card requires categoryId and imageUrl' };
      return;
    }
    if (isProductSlide && parsedCategoryCards.hasDuplicates) {
      slide = { __error: 'Duplicate categories are not allowed in a product slide' };
      return;
    }
    if (isProductSlide && parsedSeriesCards.hasIncomplete) {
      slide = { __error: 'Each series card requires seriesId and imageUrl' };
      return;
    }
    if (isProductSlide && parsedSeriesCards.hasDuplicates) {
      slide = { __error: 'Duplicate series are not allowed in a product slide' };
      return;
    }

    if (isProductSlide) {
      const contentError = validateProductSlideContent(
        db,
        normalizedProductIds,
        parsedCategoryCards.cards,
        parsedSeriesCards.cards,
        layoutResult.value
      );
      if (contentError) {
        slide = { __error: contentError };
        return;
      }
    }

    slide = {
      id: createId('slide'),
      title: title || '',
      subtitle: subtitle || '',
      type: type || 'image',
      url: url || '',
      ctaLabel: ctaLabel || '',
      ctaLink: ctaLink || '',
      topbarLinkColor: parsedTopbarColor.value,
      fontColor: parsedFontColor.value,
      titleSize: parsedTitleSize.value,
      titlePosition: parsedTitlePosition.value,
      productIds: isProductSlide ? normalizedProductIds : [],
      categoryCards: isProductSlide ? parsedCategoryCards.cards : [],
      seriesCards: isProductSlide ? parsedSeriesCards.cards : [],
      layout: isProductSlide ? layoutResult.value : 0,
      order: db.slides.length + 1,
    };

    db.slides.push(slide);
  });

  if (slide?.__error) {
    return res.status(400).json({ message: slide.__error });
  }

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
  const payload = req.body || {};
  const hasTopbarColor = Object.prototype.hasOwnProperty.call(payload, 'topbarLinkColor');
  const hasFontColor = Object.prototype.hasOwnProperty.call(payload, 'fontColor');
  const hasTitleSize = Object.prototype.hasOwnProperty.call(payload, 'titleSize');
  const hasTitlePosition = Object.prototype.hasOwnProperty.call(payload, 'titlePosition');
  const parsedTopbarColor = hasTopbarColor ? normalizeHexColor(payload.topbarLinkColor) : null;
  const parsedFontColor = hasFontColor ? normalizeHexColor(payload.fontColor) : null;
  const parsedTitleSize = hasTitleSize ? normalizeSlideTitleSize(payload.titleSize) : null;
  const parsedTitlePosition = hasTitlePosition ? normalizeSlideTitlePosition(payload.titlePosition) : null;

  if (parsedTopbarColor && !parsedTopbarColor.valid) {
    return res.status(400).json({ message: 'topbarLinkColor must be a valid hex color' });
  }
  if (parsedFontColor && !parsedFontColor.valid) {
    return res.status(400).json({ message: 'fontColor must be a valid hex color' });
  }
  if (parsedTitleSize && !parsedTitleSize.valid) {
    return res.status(400).json({
      message: `titleSize must be a px value between ${MIN_SLIDE_TITLE_SIZE_PX}px and ${MAX_SLIDE_TITLE_SIZE_PX}px (legacy small/medium/large also supported)`,
    });
  }
  if (parsedTitlePosition && !parsedTitlePosition.valid) {
    return res.status(400).json({
      message: 'titlePosition must be one of: bottom-left, bottom-center, bottom-right, middle-left, middle-center, middle-right, top-left, top-center, top-right',
    });
  }

  const hasProductIds = Object.prototype.hasOwnProperty.call(payload, 'productIds');
  const hasCategoryCards = Object.prototype.hasOwnProperty.call(payload, 'categoryCards');
  const hasSeriesCards = Object.prototype.hasOwnProperty.call(payload, 'seriesCards');
  const hasLayout = Object.prototype.hasOwnProperty.call(payload, 'layout');

  if (hasProductIds && !Array.isArray(payload.productIds)) {
    return res.status(400).json({ message: 'productIds must be an array' });
  }
  if (hasCategoryCards && !Array.isArray(payload.categoryCards)) {
    return res.status(400).json({ message: 'categoryCards must be an array' });
  }
  if (hasSeriesCards && !Array.isArray(payload.seriesCards)) {
    return res.status(400).json({ message: 'seriesCards must be an array' });
  }

  let slide;
  let validationError = '';
  writeDb((db) => {
    slide = db.slides.find((item) => item.id === id);
    if (!slide) {
      return;
    }

    const nextType = payload.type ?? slide.type;
    const normalizedProductIds = normalizeSlideProductIds(hasProductIds ? payload.productIds : slide.productIds);
    const parsedCategoryCards = normalizeSlideCategoryCards(hasCategoryCards ? payload.categoryCards : slide.categoryCards);
    const parsedSeriesCards = normalizeSlideSeriesCards(hasSeriesCards ? payload.seriesCards : slide.seriesCards);
    const layoutResult = normalizeProductSlideLayout(
      hasLayout ? payload.layout : slide.layout,
      hasLayout
    );

    if (nextType === 'products') {
      if (!layoutResult.valid) {
        validationError = 'layout must be one of: 1, 2, 3 for product slides';
        return;
      }

      if (parsedCategoryCards.hasIncomplete) {
        validationError = 'Each category card requires categoryId and imageUrl';
        return;
      }
      if (parsedCategoryCards.hasDuplicates) {
        validationError = 'Duplicate categories are not allowed in a product slide';
        return;
      }
      if (parsedSeriesCards.hasIncomplete) {
        validationError = 'Each series card requires seriesId and imageUrl';
        return;
      }
      if (parsedSeriesCards.hasDuplicates) {
        validationError = 'Duplicate series are not allowed in a product slide';
        return;
      }

      const contentError = validateProductSlideContent(
        db,
        normalizedProductIds,
        parsedCategoryCards.cards,
        parsedSeriesCards.cards,
        layoutResult.value
      );
      if (contentError) {
        validationError = contentError;
        return;
      }
    }

    Object.assign(slide, {
      title: payload.title ?? slide.title,
      subtitle: payload.subtitle ?? slide.subtitle,
      type: nextType,
      url: payload.url ?? slide.url,
      ctaLabel: payload.ctaLabel ?? slide.ctaLabel,
      ctaLink: payload.ctaLink ?? slide.ctaLink,
      topbarLinkColor: parsedTopbarColor ? parsedTopbarColor.value : (slide.topbarLinkColor || ''),
      fontColor: parsedFontColor ? parsedFontColor.value : (slide.fontColor || ''),
      titleSize: parsedTitleSize ? parsedTitleSize.value : (slide.titleSize || '72px'),
      titlePosition: parsedTitlePosition ? parsedTitlePosition.value : (slide.titlePosition || 'bottom-left'),
      productIds: nextType === 'products' ? normalizedProductIds : [],
      categoryCards: nextType === 'products' ? parsedCategoryCards.cards : [],
      seriesCards: nextType === 'products' ? parsedSeriesCards.cards : [],
      layout: nextType === 'products' ? layoutResult.value : 0,
      order: payload.order !== undefined ? Number(payload.order) : slide.order,
    });
  });

  if (!slide) {
    return res.status(404).json({ message: 'Slide not found' });
  }
  if (validationError) {
    return res.status(400).json({ message: validationError });
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
  const incomingContact = req.body?.serviceContact;
  const incomingRazorpay = req.body?.razorpay;

  let settings;
  writeDb((db) => {
    db.settings = db.settings || {};

    if (incomingContact) {
      const current = db.settings.serviceContact || {};
      db.settings.serviceContact = {
        supportEmail: incomingContact.supportEmail ?? current.supportEmail ?? '',
        contactNumber: incomingContact.contactNumber ?? current.contactNumber ?? '',
        contactHours: incomingContact.contactHours ?? current.contactHours ?? '',
      };
    }

    if (incomingRazorpay) {
      const current = db.settings.razorpay || {};
      db.settings.razorpay = {
        keyId: incomingRazorpay.keyId ?? current.keyId ?? '',
        secret: incomingRazorpay.secret ?? current.secret ?? '',
      };
    }

    settings = db.settings;
  });

  return res.json({ message: 'Settings updated', settings });
});

adminRouter.put('/settings/logo-video', (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ message: 'url is required' });
  }

  let settings;
  writeDb((db) => {
    db.settings = db.settings || {};
    db.settings.logoVideo = url;
    settings = db.settings;
  });

  return res.json({ message: 'Logo video updated', settings });
});

adminRouter.delete('/settings/logo-video', (_req, res) => {
  writeDb((db) => {
    db.settings = db.settings || {};
    db.settings.logoVideo = '';
  });

  return res.json({ message: 'Logo video removed' });
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

adminRouter.put('/hb-productions/:id', (req, res) => {
  const id = req.params.id;
  const { title, excerpt, image, body } = req.body;

  let post;
  writeDb((db) => {
    post = db.hbProductions.find((item) => item.id === id);
    if (!post) return;

    post.title = title ?? post.title;
    post.excerpt = excerpt ?? post.excerpt;
    post.image = image ?? post.image;
    post.body = body ?? post.body;
  });

  if (!post) {
    return res.status(404).json({ message: 'Post not found' });
  }

  return res.json({ post });
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
                  <strong style="font-size:14px;color:#111;">${order.orderNumber || order.id}</strong>
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
      subject: `HEMBIT — Order ${order.orderNumber || order.id} is now ${order.status}`,
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

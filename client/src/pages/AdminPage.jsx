import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const TABS = [
  'Dashboard',
  'Products',
  'Categories',
  'Slides',
  'HB Productions',
  'Content',
  'Logo Management',
  'Settings',
  'Users',
  'Orders',
  'Newsletter',
  'Users & Subscribers Mail',
];
const HEX_COLOR_PATTERN = /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const SLIDE_TITLE_SIZE_OPTIONS_PX = [5, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 88, 96];
const SLIDE_TITLE_SIZES = SLIDE_TITLE_SIZE_OPTIONS_PX.map((px) => ({
  value: `${px}px`,
  label: `Title Size: ${px}px`,
}));
const SLIDE_TITLE_POSITIONS = [
  { value: 'bottom-left', label: 'Title Position: Bottom Left' },
  { value: 'bottom-center', label: 'Title Position: Bottom Center' },
  { value: 'bottom-right', label: 'Title Position: Bottom Right' },
  { value: 'middle-left', label: 'Title Position: Middle Left' },
  { value: 'middle-center', label: 'Title Position: Middle Center' },
  { value: 'middle-right', label: 'Title Position: Middle Right' },
  { value: 'top-left', label: 'Title Position: Top Left' },
  { value: 'top-center', label: 'Title Position: Top Center' },
  { value: 'top-right', label: 'Title Position: Top Right' },
];
const LEGACY_SLIDE_TITLE_SIZE_MAP = {
  small: '48px',
  medium: '72px',
  large: '96px',
};
const LEGACY_SLIDE_TITLE_SIZE_POINTS = [
  { key: 'small', px: 48 },
  { key: 'medium', px: 72 },
  { key: 'large', px: 96 },
];
const DEFAULT_SLIDE_TITLE_SIZE = '72px';
const PRODUCT_SLIDE_LAYOUT_OPTIONS = [1, 2, 3];

function normalizeSlideTitleSizeForForm(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) {
    return DEFAULT_SLIDE_TITLE_SIZE;
  }
  if (LEGACY_SLIDE_TITLE_SIZE_MAP[raw]) {
    return LEGACY_SLIDE_TITLE_SIZE_MAP[raw];
  }

  const match = raw.match(/^(\d{1,3})(?:px)?$/);
  if (!match) {
    return DEFAULT_SLIDE_TITLE_SIZE;
  }

  const requestedPx = Number(match[1]);
  const closest = SLIDE_TITLE_SIZE_OPTIONS_PX.reduce((best, sizePx) => {
    return Math.abs(sizePx - requestedPx) < Math.abs(best - requestedPx) ? sizePx : best;
  }, SLIDE_TITLE_SIZE_OPTIONS_PX[0]);

  return `${closest}px`;
}

function toLegacySlideTitleSize(value) {
  const normalized = normalizeSlideTitleSizeForForm(value);
  const px = Number.parseInt(normalized, 10);
  if (!Number.isFinite(px)) {
    return 'medium';
  }

  const closest = LEGACY_SLIDE_TITLE_SIZE_POINTS.reduce((best, item) => {
    return Math.abs(item.px - px) < Math.abs(best.px - px) ? item : best;
  }, LEGACY_SLIDE_TITLE_SIZE_POINTS[0]);

  return closest.key;
}

function hasLegacyTitleSizeValidationError(error) {
  return /titleSize must be one of:\s*small,\s*medium,\s*large/i.test(String(error?.message || ''));
}

function normalizeProductSlideLayout(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return 2;
  }
  return Math.min(3, Math.max(1, parsed));
}

function normalizeSlideCategoryCardsForForm(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => ({
    categoryId: String(item?.categoryId || '').trim(),
    imageUrl: String(item?.imageUrl || '').trim(),
  }));
}

function normalizeSlideSeriesCardsForForm(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => ({
    seriesId: String(item?.seriesId || '').trim(),
    imageUrl: String(item?.imageUrl || '').trim(),
  }));
}

function createInitialSlideForm() {
  return {
    title: '',
    subtitle: '',
    type: 'image',
    url: '',
    ctaLabel: '',
    ctaLink: '',
    topbarLinkColor: '',
    fontColor: '',
    productIds: [],
    categoryCards: [],
    seriesCards: [],
    layout: 2,
    titleSize: DEFAULT_SLIDE_TITLE_SIZE,
    titlePosition: 'bottom-left',
  };
}

function normalizePostImages(images, image) {
  const seen = new Set();
  const list = [];

  const pushUrl = (value) => {
    const url = String(value || '').trim();
    if (!url || seen.has(url)) {
      return;
    }
    seen.add(url);
    list.push(url);
  };

  if (Array.isArray(images)) {
    images.forEach(pushUrl);
  }

  pushUrl(image);

  return list;
}

function createInitialPostForm() {
  return {
    title: '',
    excerpt: '',
    image: '',
    images: [],
    galleryPosition: 'above_text',
    body: '',
  };
}

export function AdminPage() {
  const { token, signout } = useAuth();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [message, setMessage] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [slides, setSlides] = useState([]);
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState({});
  const [settings, setSettings] = useState({
    serviceContact: {
      supportEmail: '',
      contactNumber: '',
      contactHours: '',
    },
  });
  const [orders, setOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState('All');
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [userList, setUserList] = useState([]);
  const [newsletter, setNewsletter] = useState({ subscribers: [], mails: [] });
  const [mailRecipients, setMailRecipients] = useState({
    recipients: { users: [], subscribers: [], both: [] },
    counts: { users: 0, subscribers: 0, both: 0 },
  });

  const [productForm, setProductForm] = useState({
    name: '',
    categoryId: '',
    seriesId: '',
    price: '',
    description: '',
    details: '',
    careInstructions: '',
    sizesCsv: 'S,M,L,XL',
    stock: 0,
    featured: false,
    isAvailable: true,
    unavailableButtonText: 'Currently Unavailable',
  });
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '' });
  const [seriesForm, setSeriesForm] = useState({ categoryId: '', name: '', slug: '' });
  const [slideForm, setSlideForm] = useState(createInitialSlideForm);
  const [slideUploadState, setSlideUploadState] = useState({ loading: false, message: '' });
  const [slideCategoryUploadState, setSlideCategoryUploadState] = useState({ loadingIndex: -1, message: '' });
  const [slideSeriesUploadState, setSlideSeriesUploadState] = useState({ loadingIndex: -1, message: '' });
  const [postForm, setPostForm] = useState(createInitialPostForm);
  const [postImageUploading, setPostImageUploading] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingSeries, setEditingSeries] = useState(null);
  const [editingSlideId, setEditingSlideId] = useState(null);
  const [editingPostId, setEditingPostId] = useState(null);
  const [newsletterForm, setNewsletterForm] = useState({ subject: '', body: '' });
  const [settingsForm, setSettingsForm] = useState({
    supportEmail: '',
    contactNumber: '',
    contactHours: '',
    razorpayKeyId: '',
    razorpaySecret: '',
  });
  const [mailForm, setMailForm] = useState({
    audience: 'both',
    subject: '',
    body: '',
  });
  const [mailSelectedEmails, setMailSelectedEmails] = useState([]);
  const [mailUserSearch, setMailUserSearch] = useState('');
  const [logoVideo, setLogoVideo] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const logoFileRef = useRef(null);
  const postImageInputRef = useRef(null);

  const loadAll = async () => {
    const [dash, prod, cat, sl, hb, cnt, sett, usersData, ord, news, recipients] = await Promise.all([
      api.get('/admin/dashboard', token),
      api.get('/admin/products', token),
      api.get('/admin/categories', token),
      api.get('/admin/slides', token),
      api.get('/admin/hb-productions', token),
      api.get('/admin/content', token),
      api.get('/admin/settings', token),
      api.get('/admin/users', token),
      api.get('/admin/orders', token),
      api.get('/admin/newsletter', token),
      api.get('/admin/mail/recipients', token),
    ]);

    setDashboard(dash.metrics);
    setProducts(prod.products);
    setCategories(cat.categories);
    setSlides(sl.slides);
    setPosts(hb.posts);
    setContent(cnt.content);
    setSettings(sett.settings);
    setSettingsForm({
      supportEmail: sett.settings?.serviceContact?.supportEmail || '',
      contactNumber: sett.settings?.serviceContact?.contactNumber || '',
      contactHours: sett.settings?.serviceContact?.contactHours || '',
      razorpayKeyId: sett.settings?.razorpay?.keyId || '',
      razorpaySecret: sett.settings?.razorpay?.secret || '',
    });
    setLogoVideo(sett.settings?.logoVideo || '');
    setUserList(usersData.users || []);
    setOrders(ord.orders);
    setNewsletter(news);
    setMailRecipients(recipients);
  };

  useEffect(() => {
    loadAll().catch((error) => setMessage(error.message));
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === productForm.categoryId),
    [categories, productForm.categoryId]
  );
  const allSeriesOptions = useMemo(() => {
    return categories.flatMap((category) => {
      return (category.series || []).map((series) => ({
        seriesId: series.id,
        categoryId: category.id,
        categoryName: category.name,
        categorySlug: category.slug,
        seriesName: series.name,
        seriesSlug: series.slug,
      }));
    });
  }, [categories]);

  const slideLayout = normalizeProductSlideLayout(slideForm.layout);
  const slideCategoryCardRows = normalizeSlideCategoryCardsForForm(slideForm.categoryCards);
  const slideSeriesCardRows = normalizeSlideSeriesCardsForForm(slideForm.seriesCards);
  const completedSlideCategoryCards = slideCategoryCardRows.filter((item) => item.categoryId && item.imageUrl);
  const completedSlideSeriesCards = slideSeriesCardRows.filter((item) => item.seriesId && item.imageUrl);
  const totalSlideCardsSelected =
    (slideForm.productIds?.length || 0) + completedSlideCategoryCards.length + completedSlideSeriesCards.length;
  const remainingProductSlots = Math.max(
    0,
    slideLayout - completedSlideCategoryCards.length - completedSlideSeriesCards.length
  );
  const canAddCategoryCard =
    (slideForm.productIds?.length || 0) + slideCategoryCardRows.length + slideSeriesCardRows.length < slideLayout;
  const canAddSeriesCard =
    (slideForm.productIds?.length || 0) + slideCategoryCardRows.length + slideSeriesCardRows.length < slideLayout;
  const postFormImages = normalizePostImages(postForm.images, postForm.image);

  const uploadSlideFile = async (file) => {
    if (!file) {
      return;
    }

    const toDataUrl = () =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

    setSlideUploadState({ loading: true, message: '' });
    try {
      const dataUrl = await toDataUrl();
      const uploaded = await api.post(
        '/admin/media/upload',
        {
          filename: file.name,
          dataUrl,
        },
        token
      );
      setSlideForm((prev) => ({
        ...prev,
        url: uploaded.url,
        type: file.type.startsWith('video/') ? 'video' : 'image',
      }));
      setSlideUploadState({ loading: false, message: 'File uploaded and URL applied' });
    } catch (error) {
      setSlideUploadState({ loading: false, message: error.message });
    }
  };

  const uploadCategoryCardImage = async (index, file) => {
    if (!file) {
      return;
    }

    setSlideCategoryUploadState({ loadingIndex: index, message: '' });
    try {
      const uploaded = await api.uploadFile(file, token);
      setSlideForm((prev) => ({
        ...prev,
        categoryCards: (prev.categoryCards || []).map((item, cardIndex) =>
          cardIndex === index ? { ...item, imageUrl: uploaded.url } : item
        ),
      }));
      setSlideCategoryUploadState({ loadingIndex: -1, message: 'Category image uploaded' });
    } catch (error) {
      setSlideCategoryUploadState({ loadingIndex: -1, message: error.message });
    }
  };

  const uploadSeriesCardImage = async (index, file) => {
    if (!file) {
      return;
    }

    setSlideSeriesUploadState({ loadingIndex: index, message: '' });
    try {
      const uploaded = await api.uploadFile(file, token);
      setSlideForm((prev) => ({
        ...prev,
        seriesCards: (prev.seriesCards || []).map((item, cardIndex) =>
          cardIndex === index ? { ...item, imageUrl: uploaded.url } : item
        ),
      }));
      setSlideSeriesUploadState({ loadingIndex: -1, message: 'Series image uploaded' });
    } catch (error) {
      setSlideSeriesUploadState({ loadingIndex: -1, message: error.message });
    }
  };

  const uploadPostImages = async (files) => {
    const imageFiles = Array.from(files || []).filter((file) => file.type.startsWith('image/'));
    if (!imageFiles.length) {
      setMessage('Please select image files for story gallery');
      return;
    }

    setPostImageUploading(true);
    try {
      const uploaded = await Promise.all(imageFiles.map((file) => api.uploadFile(file, token)));
      const uploadedUrls = uploaded.map((item) => item.url).filter(Boolean);
      setPostForm((prev) => {
        const merged = normalizePostImages([...(prev.images || []), ...uploadedUrls], prev.image);
        return {
          ...prev,
          image: merged[0] || '',
          images: merged,
        };
      });
      setMessage('Story image(s) uploaded');
    } catch (error) {
      setMessage(error.message);
    }
    setPostImageUploading(false);
  };

  return (
    <section className="admin-shell">
      <aside className="admin-sidebar">
        <h1>HEMBIT Admin</h1>
        {TABS.map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={activeTab === tab ? 'active' : ''}>
            {tab}
          </button>
        ))}
        <div className="admin-sidebar-spacer" />
        <button type="button" className="admin-logout-btn" onClick={signout}>
          Logout
        </button>
      </aside>

      <main className="admin-main">
        {message && <p className="form-message">{message}</p>}

        {activeTab === 'Dashboard' && dashboard && (
          <div className="admin-block" style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
            <h2 style={{ border: 0, paddingBottom: 0.4 + 'rem' }}>Dashboard</h2>
            <div className="admin-grid">
              {Object.entries(dashboard).map(([key, value]) => (
                <article key={key} className="metric-card">
                  <p>{key}</p>
                  <strong>{value}</strong>
                </article>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Products' && (
          <div className="admin-block">
            <h2>{editingProductId ? 'Edit Product' : 'Add Product'}</h2>
            <div className="admin-form-grid">
              <input
                placeholder="Name"
                value={productForm.name}
                onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <select
                value={productForm.categoryId}
                onChange={(e) =>
                  setProductForm((prev) => ({ ...prev, categoryId: e.target.value, seriesId: '' }))
                }
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <select
                value={productForm.seriesId}
                onChange={(e) => setProductForm((prev) => ({ ...prev, seriesId: e.target.value }))}
              >
                <option value="">Select Series</option>
                {(selectedCategory?.series || []).map((series) => (
                  <option key={series.id} value={series.id}>
                    {series.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Price"
                value={productForm.price}
                onChange={(e) => setProductForm((prev) => ({ ...prev, price: e.target.value }))}
                disabled={!productForm.isAvailable}
              />
              <input
                type="number"
                placeholder="Stock"
                value={productForm.stock}
                onChange={(e) => setProductForm((prev) => ({ ...prev, stock: e.target.value }))}
              />
              <select
                value={productForm.isAvailable ? 'yes' : 'no'}
                onChange={(e) =>
                  setProductForm((prev) => ({ ...prev, isAvailable: e.target.value === 'yes' }))
                }
              >
                <option value="yes">Available</option>
                <option value="no">Not Available</option>
              </select>
              {!productForm.isAvailable && (
                <input
                  placeholder="Unavailable button text"
                  value={productForm.unavailableButtonText}
                  onChange={(e) =>
                    setProductForm((prev) => ({ ...prev, unavailableButtonText: e.target.value }))
                  }
                />
              )}
              <input
                placeholder="Sizes (comma separated)"
                value={productForm.sizesCsv}
                onChange={(e) => setProductForm((prev) => ({ ...prev, sizesCsv: e.target.value }))}
              />
            </div>

            {/* Image uploader */}
            <div className="admin-image-uploader">
              <p className="admin-image-uploader-label">Product Images</p>
              <div
                className="admin-image-dropzone"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
                onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('dragover');
                  const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
                  if (!files.length) return;
                  setUploading(true);
                  try {
                    const results = await Promise.all(files.map((f) => api.uploadFile(f, token)));
                    setUploadedImages((prev) => [...prev, ...results.map((r) => r.url)]);
                  } catch (err) {
                    setMessage(err.message);
                  }
                  setUploading(false);
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const files = Array.from(e.target.files);
                    if (!files.length) return;
                    setUploading(true);
                    try {
                      const results = await Promise.all(files.map((f) => api.uploadFile(f, token)));
                      setUploadedImages((prev) => [...prev, ...results.map((r) => r.url)]);
                    } catch (err) {
                      setMessage(err.message);
                    }
                    setUploading(false);
                    e.target.value = '';
                  }}
                />
                {uploading ? (
                  <span className="admin-image-dropzone-text">Uploading...</span>
                ) : (
                  <span className="admin-image-dropzone-text">+ Click or drag images here</span>
                )}
              </div>
              {uploadedImages.length > 0 && (
                <div className="admin-image-preview-grid">
                  {uploadedImages.map((url, idx) => (
                    <div className="admin-image-preview" key={url}>
                      <img src={url} alt={`Product ${idx + 1}`} />
                      <div className="admin-image-preview-actions">
                        {idx > 0 && (
                          <button
                            type="button"
                            title="Move left"
                            onClick={() =>
                              setUploadedImages((prev) => {
                                const copy = [...prev];
                                [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
                                return copy;
                              })
                            }
                          >
                            ←
                          </button>
                        )}
                        {idx < uploadedImages.length - 1 && (
                          <button
                            type="button"
                            title="Move right"
                            onClick={() =>
                              setUploadedImages((prev) => {
                                const copy = [...prev];
                                [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
                                return copy;
                              })
                            }
                          >
                            →
                          </button>
                        )}
                        <button
                          type="button"
                          title="Remove"
                          onClick={() =>
                            setUploadedImages((prev) => prev.filter((_, i) => i !== idx))
                          }
                        >
                          ×
                        </button>
                      </div>
                      {idx === 0 && <span className="admin-image-badge">Main</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <textarea
              placeholder="Description"
              value={productForm.description}
              onChange={(e) => setProductForm((prev) => ({ ...prev, description: e.target.value }))}
            />
            <textarea
              placeholder="More Details"
              value={productForm.details}
              onChange={(e) => setProductForm((prev) => ({ ...prev, details: e.target.value }))}
            />
            <textarea
              placeholder="Care Instructions"
              value={productForm.careInstructions}
              onChange={(e) => setProductForm((prev) => ({ ...prev, careInstructions: e.target.value }))}
            />
            <label>
              <input
                type="checkbox"
                checked={productForm.featured}
                onChange={(e) => setProductForm((prev) => ({ ...prev, featured: e.target.checked }))}
              />
              Featured
            </label>
            <button
              type="button"
              onClick={async () => {
                try {
                  const unavailableButtonText = productForm.unavailableButtonText.trim();
                  if (!productForm.isAvailable && !unavailableButtonText) {
                    setMessage('Unavailable button text is required when product is not available');
                    return;
                  }

                  const payload = {
                    ...productForm,
                    unavailableButtonText,
                    images: uploadedImages,
                    sizes: productForm.sizesCsv
                      .split(',')
                      .map((item) => item.trim())
                      .filter(Boolean),
                  };
                  if (editingProductId) {
                    await api.put(`/admin/products/${editingProductId}`, payload, token);
                    setMessage('Product updated');
                    setEditingProductId(null);
                  } else {
                    await api.post('/admin/products', payload, token);
                    setMessage('Product added');
                  }
                  setProductForm({
                    name: '',
                    categoryId: '',
                    seriesId: '',
                    price: '',
                    description: '',
                    details: '',
                    careInstructions: '',
                    sizesCsv: 'S,M,L,XL',
                    stock: 0,
                    featured: false,
                    isAvailable: true,
                    unavailableButtonText: 'Currently Unavailable',
                  });
                  setUploadedImages([]);
                  loadAll();
                } catch (error) {
                  setMessage(error.message);
                }
              }}
            >
              {editingProductId ? 'Update Product' : 'Add Product'}
            </button>
            {editingProductId && (
              <button
                type="button"
                style={{ marginLeft: 8, background: '#666' }}
                onClick={() => {
                  setEditingProductId(null);
                  setProductForm({
                    name: '',
                    categoryId: '',
                    seriesId: '',
                    price: '',
                    description: '',
                    details: '',
                    careInstructions: '',
                    sizesCsv: 'S,M,L,XL',
                    stock: 0,
                    featured: false,
                    isAvailable: true,
                    unavailableButtonText: 'Currently Unavailable',
                  });
                  setUploadedImages([]);
                }}
              >
                Cancel
              </button>
            )}

            <h3>Existing Products</h3>
            {products.map((product) => (
              <article key={product.id} className="admin-list-item">
                <div>
                  <strong>{product.name}</strong>
                  <p>{product.slug}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProductId(product.id);
                      setProductForm({
                        name: product.name || '',
                        categoryId: product.categoryId || '',
                        seriesId: product.seriesId || '',
                        price: product.price ?? '',
                        description: product.description || '',
                        details: product.details || '',
                        careInstructions: product.careInstructions || '',
                        sizesCsv: (product.sizes || []).join(','),
                        stock: product.stock ?? 0,
                        featured: product.featured || false,
                        isAvailable: product.isAvailable !== false,
                        unavailableButtonText: product.unavailableButtonText || 'Currently Unavailable',
                      });
                      setUploadedImages(product.images || []);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await api.del(`/admin/products/${product.id}`, token);
                      loadAll();
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {activeTab === 'Categories' && (
          <div className="admin-block">
            <h2>Category Management</h2>
            <div className="inline-form">
              <input
                placeholder="Category name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <input
                placeholder="Category slug"
                value={categoryForm.slug}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, slug: e.target.value }))}
              />
              <button
                type="button"
                onClick={async () => {
                  try {
                    if (editingCategoryId) {
                      await api.put(`/admin/categories/${editingCategoryId}`, categoryForm, token);
                      setMessage('Category updated');
                      setEditingCategoryId(null);
                    } else {
                      await api.post('/admin/categories', categoryForm, token);
                      setMessage('Category added');
                    }
                    setCategoryForm({ name: '', slug: '' });
                    loadAll();
                  } catch (err) {
                    setMessage(err.message);
                  }
                }}
              >
                {editingCategoryId ? 'Update Category' : 'Add Category'}
              </button>
              {editingCategoryId && (
                <button
                  type="button"
                  style={{ background: '#666' }}
                  onClick={() => {
                    setEditingCategoryId(null);
                    setCategoryForm({ name: '', slug: '' });
                  }}
                >
                  Cancel
                </button>
              )}
            </div>

            <h3>{editingSeries ? 'Edit Series' : 'Add Series'}</h3>
            <div className="inline-form">
              <select
                value={seriesForm.categoryId}
                onChange={(e) => setSeriesForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                disabled={Boolean(editingSeries)}
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <input
                placeholder="Series name"
                value={seriesForm.name}
                onChange={(e) => setSeriesForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <input
                placeholder="Series slug"
                value={seriesForm.slug}
                onChange={(e) => setSeriesForm((prev) => ({ ...prev, slug: e.target.value }))}
              />
              <button
                type="button"
                onClick={async () => {
                  const name = seriesForm.name.trim();
                  const slug = seriesForm.slug.trim();

                  if (!name || !slug) {
                    setMessage('Series name and slug are required');
                    return;
                  }

                  try {
                    if (editingSeries) {
                      if (!editingSeries.categoryId || !editingSeries.seriesId) {
                        setMessage('Please select a valid series to edit');
                        return;
                      }

                      await api.put(
                        `/admin/categories/${editingSeries.categoryId}/series/${editingSeries.seriesId}`,
                        { name, slug },
                        token
                      );
                      setMessage('Series updated');
                    } else {
                      if (!seriesForm.categoryId) {
                        setMessage('Please select a category');
                        return;
                      }

                      await api.post(`/admin/categories/${seriesForm.categoryId}/series`, { name, slug }, token);
                      setMessage('Series added');
                    }
                    setEditingSeries(null);
                    setSeriesForm({ categoryId: '', name: '', slug: '' });
                    loadAll();
                  } catch (err) {
                    if (editingSeries && err.message === 'Request failed with 404') {
                      setMessage('Series edit API not found (404). Restart/redeploy backend with latest code.');
                    } else {
                      setMessage(err.message);
                    }
                  }
                }}
              >
                {editingSeries ? 'Update Series' : 'Add Series'}
              </button>
              {editingSeries && (
                <button
                  type="button"
                  style={{ background: '#666' }}
                  onClick={() => {
                    setEditingSeries(null);
                    setSeriesForm({ categoryId: '', name: '', slug: '' });
                  }}
                >
                  Cancel
                </button>
              )}
            </div>

            {categories.map((category) => (
              <article key={category.id} className="admin-list-item stacked">
                <strong>{category.name}</strong>
                <small>{category.slug}</small>
                <div className="series-list">
                  {category.series.map((series) => (
                    <span key={series.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {series.name} ({series.slug})
                      <button
                        type="button"
                        style={{ fontSize: '0.62rem', padding: '1px 6px', background: '#1f2937' }}
                        onClick={() => {
                          setEditingSeries({ categoryId: category.id, seriesId: series.id });
                          setSeriesForm({ categoryId: category.id, name: series.name, slug: series.slug });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        style={{ fontSize: '0.7rem', padding: '1px 6px', background: '#c00' }}
                        onClick={async () => {
                          await api.del(`/admin/categories/${category.id}/series/${series.id}`, token);
                          if (editingSeries?.seriesId === series.id) {
                            setEditingSeries(null);
                            setSeriesForm({ categoryId: '', name: '', slug: '' });
                          }
                          loadAll();
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategoryId(category.id);
                      setCategoryForm({ name: category.name, slug: category.slug });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await api.del(`/admin/categories/${category.id}`, token);
                      loadAll();
                    }}
                  >
                    Delete Category
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {activeTab === 'Slides' && (
          <div className="admin-block">
            <h2>{editingSlideId ? 'Edit Slide' : 'Homepage Slides'}</h2>
            <div className="admin-form-grid">
              <input
                placeholder="Title (optional)"
                value={slideForm.title}
                onChange={(e) => setSlideForm((prev) => ({ ...prev, title: e.target.value }))}
              />
              <input
                placeholder="Subtitle (optional)"
                value={slideForm.subtitle}
                onChange={(e) => setSlideForm((prev) => ({ ...prev, subtitle: e.target.value }))}
              />
              <select
                value={slideForm.titleSize}
                onChange={(e) => setSlideForm((prev) => ({ ...prev, titleSize: e.target.value }))}
              >
                {SLIDE_TITLE_SIZES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                value={slideForm.titlePosition}
                onChange={(e) => setSlideForm((prev) => ({ ...prev, titlePosition: e.target.value }))}
              >
                {SLIDE_TITLE_POSITIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                value={slideForm.type}
                onChange={(e) => {
                  const nextType = e.target.value;
                  setSlideForm((prev) => ({
                    ...prev,
                    type: nextType,
                    layout: normalizeProductSlideLayout(prev.layout),
                    productIds: nextType === 'products' ? (prev.productIds || []) : [],
                    categoryCards: nextType === 'products' ? normalizeSlideCategoryCardsForForm(prev.categoryCards) : [],
                    seriesCards: nextType === 'products' ? normalizeSlideSeriesCardsForForm(prev.seriesCards) : [],
                  }));
                  if (nextType !== 'products') {
                    setSlideCategoryUploadState({ loadingIndex: -1, message: '' });
                    setSlideSeriesUploadState({ loadingIndex: -1, message: '' });
                  }
                }}
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="products">Product Grid</option>
              </select>
              <input
                type="text"
                placeholder="Topbar Link Color (hex, optional)"
                value={slideForm.topbarLinkColor}
                onChange={(e) => setSlideForm((prev) => ({ ...prev, topbarLinkColor: e.target.value }))}
              />
              <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                <input
                  type="color"
                  value={HEX_COLOR_PATTERN.test(slideForm.topbarLinkColor) ? slideForm.topbarLinkColor : '#111111'}
                  onChange={(e) => setSlideForm((prev) => ({ ...prev, topbarLinkColor: e.target.value }))}
                  aria-label="Pick topbar link color"
                  style={{ width: 42, height: 38, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
                />
                <button
                  type="button"
                  style={{ background: '#666', padding: '0.45rem 0.75rem' }}
                  onClick={() => setSlideForm((prev) => ({ ...prev, topbarLinkColor: '' }))}
                >
                  Reset Color
                </button>
              </div>
              <input
                type="text"
                placeholder="Text Color (hex, optional)"
                value={slideForm.fontColor}
                onChange={(e) => setSlideForm((prev) => ({ ...prev, fontColor: e.target.value }))}
              />
              <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                <input
                  type="color"
                  value={HEX_COLOR_PATTERN.test(slideForm.fontColor) ? slideForm.fontColor : '#FFFFFF'}
                  onChange={(e) => setSlideForm((prev) => ({ ...prev, fontColor: e.target.value }))}
                  aria-label="Pick slide text color"
                  style={{ width: 42, height: 38, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
                />
                <button
                  type="button"
                  style={{ background: '#666', padding: '0.45rem 0.75rem' }}
                  onClick={() => setSlideForm((prev) => ({ ...prev, fontColor: '' }))}
                >
                  Reset Text Color
                </button>
              </div>

              {slideForm.type !== 'products' && (
                <>
                  <input
                    placeholder="Media URL"
                    value={slideForm.url}
                    onChange={(e) => setSlideForm((prev) => ({ ...prev, url: e.target.value }))}
                  />
                  <input
                    placeholder="CTA Label (optional)"
                    value={slideForm.ctaLabel}
                    onChange={(e) => setSlideForm((prev) => ({ ...prev, ctaLabel: e.target.value }))}
                  />
                  <input
                    placeholder="CTA Link (optional)"
                    value={slideForm.ctaLink}
                    onChange={(e) => setSlideForm((prev) => ({ ...prev, ctaLink: e.target.value }))}
                  />
                </>
              )}

              {slideForm.type === 'products' && (
                <>
                  <select
                    value={slideLayout}
                    onChange={(e) => {
                      const nextLayout = normalizeProductSlideLayout(e.target.value);
                      setSlideForm((prev) => {
                        const nextProductIds = (prev.productIds || []).slice(0, nextLayout);
                        const remainingSlots = Math.max(0, nextLayout - nextProductIds.length);
                        const categoryRows = normalizeSlideCategoryCardsForForm(prev.categoryCards).map((item) => ({
                          kind: 'category',
                          ...item,
                        }));
                        const seriesRows = normalizeSlideSeriesCardsForForm(prev.seriesCards).map((item) => ({
                          kind: 'series',
                          ...item,
                        }));
                        const limitedRows = [...categoryRows, ...seriesRows].slice(0, remainingSlots);
                        const nextCategoryCards = limitedRows
                          .filter((item) => item.kind === 'category')
                          .map(({ categoryId, imageUrl }) => ({ categoryId, imageUrl }));
                        const nextSeriesCards = limitedRows
                          .filter((item) => item.kind === 'series')
                          .map(({ seriesId, imageUrl }) => ({ seriesId, imageUrl }));
                        return {
                          ...prev,
                          layout: nextLayout,
                          productIds: nextProductIds,
                          categoryCards: nextCategoryCards,
                          seriesCards: nextSeriesCards,
                        };
                      });
                    }}
                  >
                    {PRODUCT_SLIDE_LAYOUT_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option} Slot{option > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </>
              )}
            </div>

            {slideForm.type === 'products' && (
              <div className="admin-product-picker">
                <p className="admin-image-uploader-label">
                  Select Products ({slideForm.productIds.length}/{remainingProductSlots})
                </p>
                <div className="admin-product-picker-grid">
                  {products.map((product) => {
                    const isSelected = slideForm.productIds.includes(product.id);
                    const disableUnchecked = !isSelected && totalSlideCardsSelected >= slideLayout;
                    return (
                      <label
                        key={product.id}
                        className={`admin-product-picker-item${isSelected ? ' selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={disableUnchecked}
                          onChange={() => {
                            setSlideForm((prev) => {
                              const completedCategoryCount = normalizeSlideCategoryCardsForForm(prev.categoryCards)
                                .filter((item) => item.categoryId && item.imageUrl).length;
                              const completedSeriesCount = normalizeSlideSeriesCardsForForm(prev.seriesCards)
                                .filter((item) => item.seriesId && item.imageUrl).length;
                              const maxCards = normalizeProductSlideLayout(prev.layout);
                              const currentlySelected =
                                (prev.productIds || []).length + completedCategoryCount + completedSeriesCount;
                              const ids = prev.productIds.includes(product.id)
                                ? prev.productIds.filter((id) => id !== product.id)
                                : currentlySelected < maxCards
                                  ? [...prev.productIds, product.id]
                                  : prev.productIds;
                              return { ...prev, productIds: ids };
                            });
                          }}
                        />
                        {product.images?.[0] && (
                          <img src={product.images[0]} alt={product.name} />
                        )}
                        <span>{product.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {slideForm.type === 'products' && (
              <div className="admin-slide-category-manager">
                <div className="admin-slide-category-head">
                  <p className="admin-image-uploader-label">
                    Category Cards ({completedSlideCategoryCards.length}/{slideLayout})
                  </p>
                  <button
                    type="button"
                    className="admin-slide-category-add"
                    onClick={() => {
                      setSlideForm((prev) => ({
                        ...prev,
                        categoryCards: [...normalizeSlideCategoryCardsForForm(prev.categoryCards), { categoryId: '', imageUrl: '' }],
                      }));
                    }}
                    disabled={!canAddCategoryCard || !categories.length}
                  >
                    Add Category Card
                  </button>
                </div>

                {!categories.length && (
                  <p className="form-message">Add categories first to use category cards in slides.</p>
                )}

                {slideCategoryCardRows.length > 0 && (
                  <div className="admin-slide-category-list">
                    {slideCategoryCardRows.map((card, index) => (
                      <div className="admin-slide-category-row" key={`${card.categoryId || 'new'}-${index}`}>
                        <select
                          value={card.categoryId}
                          onChange={(e) => {
                            const nextCategoryId = e.target.value;
                            setSlideForm((prev) => ({
                              ...prev,
                              categoryCards: normalizeSlideCategoryCardsForForm(prev.categoryCards).map((item, itemIndex) =>
                                itemIndex === index ? { ...item, categoryId: nextCategoryId } : item
                              ),
                            }));
                          }}
                        >
                          <option value="">Select Category</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                        <input
                          placeholder="Category Image URL"
                          value={card.imageUrl}
                          onChange={(e) => {
                            const nextImageUrl = e.target.value;
                            setSlideForm((prev) => ({
                              ...prev,
                              categoryCards: normalizeSlideCategoryCardsForForm(prev.categoryCards).map((item, itemIndex) =>
                                itemIndex === index ? { ...item, imageUrl: nextImageUrl } : item
                              ),
                            }));
                          }}
                        />
                        <div className="admin-slide-category-actions">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              uploadCategoryCardImage(index, file);
                              e.target.value = '';
                            }}
                          />
                          <button
                            type="button"
                            style={{ background: '#991b1b' }}
                            onClick={() => {
                              setSlideForm((prev) => ({
                                ...prev,
                                categoryCards: normalizeSlideCategoryCardsForForm(prev.categoryCards).filter(
                                  (_item, itemIndex) => itemIndex !== index
                                ),
                              }));
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        {slideCategoryUploadState.loadingIndex === index && (
                          <small className="admin-slide-category-note">Uploading image...</small>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {slideCategoryUploadState.message && <p className="form-message">{slideCategoryUploadState.message}</p>}
              </div>
            )}

            {slideForm.type === 'products' && (
              <div className="admin-slide-category-manager">
                <div className="admin-slide-category-head">
                  <p className="admin-image-uploader-label">
                    Series Cards ({completedSlideSeriesCards.length}/{slideLayout})
                  </p>
                  <button
                    type="button"
                    className="admin-slide-category-add"
                    onClick={() => {
                      setSlideForm((prev) => ({
                        ...prev,
                        seriesCards: [...normalizeSlideSeriesCardsForForm(prev.seriesCards), { seriesId: '', imageUrl: '' }],
                      }));
                    }}
                    disabled={!canAddSeriesCard || !allSeriesOptions.length}
                  >
                    Add Series Card
                  </button>
                </div>

                {!allSeriesOptions.length && (
                  <p className="form-message">Add series first to use series cards in slides.</p>
                )}

                {slideSeriesCardRows.length > 0 && (
                  <div className="admin-slide-category-list">
                    {slideSeriesCardRows.map((card, index) => (
                      <div className="admin-slide-category-row" key={`${card.seriesId || 'new-series'}-${index}`}>
                        <select
                          value={card.seriesId}
                          onChange={(e) => {
                            const nextSeriesId = e.target.value;
                            setSlideForm((prev) => ({
                              ...prev,
                              seriesCards: normalizeSlideSeriesCardsForForm(prev.seriesCards).map((item, itemIndex) =>
                                itemIndex === index ? { ...item, seriesId: nextSeriesId } : item
                              ),
                            }));
                          }}
                        >
                          <option value="">Select Series</option>
                          {allSeriesOptions.map((series) => (
                            <option key={series.seriesId} value={series.seriesId}>
                              {series.categoryName} / {series.seriesName}
                            </option>
                          ))}
                        </select>
                        <input
                          placeholder="Series Image URL"
                          value={card.imageUrl}
                          onChange={(e) => {
                            const nextImageUrl = e.target.value;
                            setSlideForm((prev) => ({
                              ...prev,
                              seriesCards: normalizeSlideSeriesCardsForForm(prev.seriesCards).map((item, itemIndex) =>
                                itemIndex === index ? { ...item, imageUrl: nextImageUrl } : item
                              ),
                            }));
                          }}
                        />
                        <div className="admin-slide-category-actions">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              uploadSeriesCardImage(index, file);
                              e.target.value = '';
                            }}
                          />
                          <button
                            type="button"
                            style={{ background: '#991b1b' }}
                            onClick={() => {
                              setSlideForm((prev) => ({
                                ...prev,
                                seriesCards: normalizeSlideSeriesCardsForForm(prev.seriesCards).filter(
                                  (_item, itemIndex) => itemIndex !== index
                                ),
                              }));
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        {slideSeriesUploadState.loadingIndex === index && (
                          <small className="admin-slide-category-note">Uploading image...</small>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {slideSeriesUploadState.message && <p className="form-message">{slideSeriesUploadState.message}</p>}
              </div>
            )}

            {slideForm.type !== 'products' && (
              <div className="admin-upload-row">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => uploadSlideFile(e.target.files?.[0])}
                />
                <span>
                  {slideUploadState.loading ? 'Uploading...' : 'Upload from Computer'}
                </span>
              </div>
            )}
            {slideUploadState.message && <p className="form-message">{slideUploadState.message}</p>}
            <button
              type="button"
              onClick={async () => {
                try {
                  let legacyModeUsed = false;
                  const layout = normalizeProductSlideLayout(slideForm.layout);
                  const categoryRows = normalizeSlideCategoryCardsForForm(slideForm.categoryCards);
                  const seriesRows = normalizeSlideSeriesCardsForForm(slideForm.seriesCards);
                  const hasIncompleteCategoryCard = categoryRows.some((item) => {
                    return (item.categoryId && !item.imageUrl) || (!item.categoryId && item.imageUrl);
                  });
                  const hasIncompleteSeriesCard = seriesRows.some((item) => {
                    return (item.seriesId && !item.imageUrl) || (!item.seriesId && item.imageUrl);
                  });
                  const preparedCategoryCards = categoryRows.filter((item) => item.categoryId && item.imageUrl);
                  const preparedSeriesCards = seriesRows.filter((item) => item.seriesId && item.imageUrl);
                  const preparedProductIds = Array.isArray(slideForm.productIds)
                    ? [...new Set(slideForm.productIds.filter(Boolean))]
                    : [];

                  if (slideForm.type === 'products' && hasIncompleteCategoryCard) {
                    setMessage('Each category card must include both category and category image');
                    return;
                  }
                  if (slideForm.type === 'products' && hasIncompleteSeriesCard) {
                    setMessage('Each series card must include both series and series image');
                    return;
                  }

                  if (slideForm.type === 'products') {
                    const totalCards =
                      preparedProductIds.length + preparedCategoryCards.length + preparedSeriesCards.length;
                    if (totalCards < 1) {
                      setMessage('Select at least 1 product, category, or series for product slides');
                      return;
                    }
                    if (totalCards > layout) {
                      setMessage(`Total selected products + categories + series cannot exceed ${layout}`);
                      return;
                    }
                  }

                  const preparedSlidePayload = slideForm.type === 'products'
                    ? {
                      ...slideForm,
                      layout,
                      productIds: preparedProductIds,
                      categoryCards: preparedCategoryCards,
                      seriesCards: preparedSeriesCards,
                    }
                    : {
                      ...slideForm,
                      productIds: [],
                      categoryCards: [],
                      seriesCards: [],
                      layout: 0,
                    };

                  const submit = async (payload) => {
                    if (editingSlideId) {
                      await api.put(`/admin/slides/${editingSlideId}`, payload, token);
                    } else {
                      await api.post('/admin/slides', payload, token);
                    }
                  };

                  try {
                    await submit(preparedSlidePayload);
                  } catch (error) {
                    if (!hasLegacyTitleSizeValidationError(error)) {
                      throw error;
                    }
                    legacyModeUsed = true;
                    await submit({
                      ...preparedSlidePayload,
                      titleSize: toLegacySlideTitleSize(preparedSlidePayload.titleSize),
                    });
                  }

                  setMessage(
                    editingSlideId
                      ? (legacyModeUsed ? 'Slide updated (legacy title size mode)' : 'Slide updated')
                      : (legacyModeUsed ? 'Slide added (legacy title size mode)' : 'Slide added')
                  );
                  setEditingSlideId(null);
                  setSlideForm(createInitialSlideForm());
                  setSlideCategoryUploadState({ loadingIndex: -1, message: '' });
                  setSlideSeriesUploadState({ loadingIndex: -1, message: '' });
                  loadAll();
                } catch (error) {
                  setMessage(error.message);
                }
              }}
            >
              {editingSlideId ? 'Update Slide' : 'Add Slide'}
            </button>
            {editingSlideId && (
              <button
                type="button"
                style={{ marginLeft: 8, background: '#666' }}
                onClick={() => {
                  setEditingSlideId(null);
                  setSlideForm(createInitialSlideForm());
                  setSlideCategoryUploadState({ loadingIndex: -1, message: '' });
                  setSlideSeriesUploadState({ loadingIndex: -1, message: '' });
                }}
              >
                Cancel
              </button>
            )}

            <h3>Existing Slides</h3>
            {slides.map((slide, idx) => (
              <article key={slide.id} className="admin-list-item admin-list-item--reorder">
                <div className="admin-reorder-arrows">
                  <button
                    type="button"
                    className="admin-reorder-btn"
                    disabled={idx === 0}
                    title="Move up"
                    onClick={async () => {
                      const ids = slides.map((s) => s.id);
                      [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
                      await api.put('/admin/slides/reorder', { ids }, token);
                      loadAll();
                    }}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    className="admin-reorder-btn"
                    disabled={idx === slides.length - 1}
                    title="Move down"
                    onClick={async () => {
                      const ids = slides.map((s) => s.id);
                      [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
                      await api.put('/admin/slides/reorder', { ids }, token);
                      loadAll();
                    }}
                  >
                    ▼
                  </button>
                </div>
                <span className="admin-reorder-pos">{idx + 1}</span>
                <div className="admin-list-item-info">
                  <strong>{slide.title || (slide.type === 'products' ? 'Product Grid' : 'Image/Video Slide')}</strong>
                  <p>
                    {slide.type}
                    {slide.type === 'products'
                      ? ` · ${normalizeProductSlideLayout(slide.layout)} slots · ${(slide.productIds || []).length} products · ${(slide.categoryCards || []).length} categories · ${(slide.seriesCards || []).length} series`
                      : ''}
                    {` · ${normalizeSlideTitleSizeForForm(slide.titleSize)} · ${slide.titlePosition || 'bottom-left'}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSlideId(slide.id);
                    setSlideForm({
                      title: slide.title || '',
                      subtitle: slide.subtitle || '',
                      type: slide.type || 'image',
                      url: slide.url || '',
                      ctaLabel: slide.ctaLabel || '',
                      ctaLink: slide.ctaLink || '',
                      topbarLinkColor: slide.topbarLinkColor || '',
                      fontColor: slide.fontColor || '',
                      productIds: slide.productIds || [],
                      categoryCards: normalizeSlideCategoryCardsForForm(slide.categoryCards),
                      seriesCards: normalizeSlideSeriesCardsForForm(slide.seriesCards),
                      layout: normalizeProductSlideLayout(slide.layout || 2),
                      titleSize: normalizeSlideTitleSizeForForm(slide.titleSize),
                      titlePosition: slide.titlePosition || 'bottom-left',
                    });
                    setSlideCategoryUploadState({ loadingIndex: -1, message: '' });
                    setSlideSeriesUploadState({ loadingIndex: -1, message: '' });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await api.del(`/admin/slides/${slide.id}`, token);
                    loadAll();
                  }}
                >
                  Delete
                </button>
              </article>
            ))}
          </div>
        )}

        {activeTab === 'HB Productions' && (
          <div className="admin-block">
            <h2>{editingPostId ? 'Edit Blog Post' : 'HB Productions Blogs'}</h2>
            <input
              placeholder="Title"
              value={postForm.title}
              onChange={(e) => setPostForm((prev) => ({ ...prev, title: e.target.value }))}
            />
            <input
              placeholder="Excerpt"
              value={postForm.excerpt}
              onChange={(e) => setPostForm((prev) => ({ ...prev, excerpt: e.target.value }))}
            />
            <select
              value={postForm.galleryPosition}
              onChange={(e) => setPostForm((prev) => ({ ...prev, galleryPosition: e.target.value }))}
            >
              <option value="above_text">Other Images Above Text</option>
              <option value="below_text">Other Images Below Text</option>
            </select>
            <input
              placeholder="Cover Image URL (optional)"
              value={postForm.image}
              onChange={(e) =>
                setPostForm((prev) => {
                  const manualUrl = e.target.value;
                  const merged = normalizePostImages(prev.images, manualUrl);
                  return {
                    ...prev,
                    image: manualUrl,
                    images: merged,
                  };
                })
              }
            />
            <div className="admin-image-uploader">
              <p className="admin-image-uploader-label">Story Images (Add Multiple)</p>
              <div
                className="admin-image-dropzone"
                onClick={() => postImageInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('dragover');
                }}
                onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('dragover');
                  await uploadPostImages(e.dataTransfer.files);
                }}
              >
                <input
                  ref={postImageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    await uploadPostImages(e.target.files);
                    e.target.value = '';
                  }}
                />
                {postImageUploading ? (
                  <span className="admin-image-dropzone-text">Uploading...</span>
                ) : (
                  <span className="admin-image-dropzone-text">+ Click or drag story images here</span>
                )}
              </div>
              {postFormImages.length > 0 && (
                <div className="admin-image-preview-grid">
                  {postFormImages.map((url, idx) => (
                    <div className="admin-image-preview" key={`${url}-${idx}`}>
                      <img src={url} alt={`Story ${idx + 1}`} />
                      <div className="admin-image-preview-actions">
                        {idx > 0 && (
                          <button
                            type="button"
                            title="Move left"
                            onClick={() =>
                              setPostForm((prev) => {
                                const nextImages = [...normalizePostImages(prev.images, prev.image)];
                                [nextImages[idx - 1], nextImages[idx]] = [nextImages[idx], nextImages[idx - 1]];
                                return {
                                  ...prev,
                                  image: nextImages[0] || '',
                                  images: nextImages,
                                };
                              })
                            }
                          >
                            {'<'}
                          </button>
                        )}
                        {idx < postFormImages.length - 1 && (
                          <button
                            type="button"
                            title="Move right"
                            onClick={() =>
                              setPostForm((prev) => {
                                const nextImages = [...normalizePostImages(prev.images, prev.image)];
                                [nextImages[idx], nextImages[idx + 1]] = [nextImages[idx + 1], nextImages[idx]];
                                return {
                                  ...prev,
                                  image: nextImages[0] || '',
                                  images: nextImages,
                                };
                              })
                            }
                          >
                            {'>'}
                          </button>
                        )}
                        <button
                          type="button"
                          title="Remove image"
                          onClick={() =>
                            setPostForm((prev) => {
                              const nextImages = normalizePostImages(prev.images, prev.image).filter((_, i) => i !== idx);
                              return {
                                ...prev,
                                image: nextImages[0] || '',
                                images: nextImages,
                              };
                            })
                          }
                        >
                          X
                        </button>
                      </div>
                      {idx === 0 && <span className="admin-image-badge">Cover</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <textarea
              placeholder="Body"
              value={postForm.body}
              onChange={(e) => setPostForm((prev) => ({ ...prev, body: e.target.value }))}
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  const preparedImages = normalizePostImages(postForm.images, postForm.image);
                  const payload = {
                    ...postForm,
                    image: preparedImages[0] || '',
                    images: preparedImages,
                  };
                  if (editingPostId) {
                    await api.put(`/admin/hb-productions/${editingPostId}`, payload, token);
                    setMessage('Blog post updated');
                    setEditingPostId(null);
                  } else {
                    await api.post('/admin/hb-productions', payload, token);
                    setMessage('Blog post added');
                  }
                  setPostForm(createInitialPostForm());
                  loadAll();
                } catch (err) {
                  setMessage(err.message);
                }
              }}
            >
              {editingPostId ? 'Update Blog' : 'Add Blog'}
            </button>
            {editingPostId && (
              <button
                type="button"
                style={{ marginLeft: 8, background: '#666' }}
                onClick={() => {
                  setEditingPostId(null);
                  setPostForm(createInitialPostForm());
                }}
              >
                Cancel
              </button>
            )}

            {posts.map((post) => (
              <article key={post.id} className="admin-list-item">
                <div>
                  <strong>{post.title}</strong>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const postImages = normalizePostImages(post.images, post.image);
                      setEditingPostId(post.id);
                      setPostForm({
                        title: post.title || '',
                        excerpt: post.excerpt || '',
                        image: postImages[0] || '',
                        images: postImages,
                        galleryPosition: post.galleryPosition === 'below_text' ? 'below_text' : 'above_text',
                        body: post.body || '',
                      });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await api.del(`/admin/hb-productions/${post.id}`, token);
                      loadAll();
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {activeTab === 'Content' && (
          <div className="admin-block">
            <h2>Editable Pages</h2>
            {Object.entries(content).map(([key, value]) => (
              <article key={key} className="content-edit-card">
                <h3>{key}</h3>
                <input
                  defaultValue={value.title}
                  onBlur={async (e) => {
                    await api.put(`/admin/content/${key}`, { title: e.target.value, body: value.body }, token);
                    loadAll();
                  }}
                />
                <textarea
                  defaultValue={value.body}
                  onBlur={async (e) => {
                    await api.put(`/admin/content/${key}`, { title: value.title, body: e.target.value }, token);
                    loadAll();
                  }}
                />
              </article>
            ))}
          </div>
        )}

        {activeTab === 'Logo Management' && (
          <div className="admin-block">
            <h2>Logo Management</h2>
            <p style={{ color: '#999', marginBottom: '1rem' }}>
              Upload your brand logo video. This will be shown as a loading animation when the website loads.
            </p>

            {logoVideo && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3>Current Logo Video</h3>
                <video
                  src={logoVideo}
                  autoPlay
                  muted
                  loop
                  playsInline
                  style={{ maxWidth: '400px', width: '100%', borderRadius: '8px', border: '1px solid #333' }}
                />
                <div style={{ marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    className="admin-btn-danger"
                    onClick={async () => {
                      try {
                        await api.del('/admin/settings/logo-video', token);
                        setLogoVideo('');
                        setMessage('Logo video removed');
                      } catch (err) {
                        setMessage(err.message);
                      }
                    }}
                  >
                    Remove Logo Video
                  </button>
                </div>
              </div>
            )}

            <h3>{logoVideo ? 'Replace Logo Video' : 'Upload Logo Video'}</h3>
            <div
              className="admin-image-dropzone"
              onClick={() => logoFileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
              onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
              onDrop={async (e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('dragover');
                const file = e.dataTransfer.files?.[0];
                if (!file || !file.type.startsWith('video/')) {
                  setMessage('Please drop a video file');
                  return;
                }
                setLogoUploading(true);
                try {
                  const dataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => reject(new Error('Failed to read file'));
                    reader.readAsDataURL(file);
                  });
                  const uploaded = await api.post('/admin/media/upload', { filename: file.name, dataUrl }, token);
                  await api.put('/admin/settings/logo-video', { url: uploaded.url }, token);
                  setLogoVideo(uploaded.url);
                  setMessage('Logo video uploaded and saved');
                } catch (err) {
                  setMessage(err.message);
                }
                setLogoUploading(false);
              }}
            >
              <input
                ref={logoFileRef}
                type="file"
                accept="video/*"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setLogoUploading(true);
                  try {
                    const dataUrl = await new Promise((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(reader.result);
                      reader.onerror = () => reject(new Error('Failed to read file'));
                      reader.readAsDataURL(file);
                    });
                    const uploaded = await api.post('/admin/media/upload', { filename: file.name, dataUrl }, token);
                    await api.put('/admin/settings/logo-video', { url: uploaded.url }, token);
                    setLogoVideo(uploaded.url);
                    setMessage('Logo video uploaded and saved');
                  } catch (err) {
                    setMessage(err.message);
                  }
                  setLogoUploading(false);
                  e.target.value = '';
                }}
              />
              {logoUploading ? (
                <span className="admin-image-dropzone-text">Uploading to Cloudinary...</span>
              ) : (
                <span className="admin-image-dropzone-text">+ Click or drag video here</span>
              )}
            </div>
          </div>
        )}

        {activeTab === 'Settings' && (
          <div className="admin-block">
            <h2>Settings</h2>
            <h3>Service Contact Information</h3>
            <div className="admin-form-grid">
              <input
                placeholder="Support email"
                value={settingsForm.supportEmail}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, supportEmail: e.target.value }))}
              />
              <input
                placeholder="Contact number"
                value={settingsForm.contactNumber}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, contactNumber: e.target.value }))}
              />
              <input
                placeholder="Contact hours"
                value={settingsForm.contactHours}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, contactHours: e.target.value }))}
              />
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  await api.put(
                    '/admin/settings',
                    {
                      serviceContact: {
                        supportEmail: settingsForm.supportEmail,
                        contactNumber: settingsForm.contactNumber,
                        contactHours: settingsForm.contactHours,
                      },
                    },
                    token
                  );
                  setMessage('Settings updated');
                  loadAll();
                } catch (error) {
                  setMessage(error.message);
                }
              }}
            >
              Save Settings
            </button>
            <p>
              Current: {settings?.serviceContact?.supportEmail} | {settings?.serviceContact?.contactNumber}
            </p>

            <h3 style={{ marginTop: '2rem' }}>Razorpay Payment Gateway</h3>
            <div className="admin-form-grid">
              <input
                placeholder="Razorpay Key ID"
                value={settingsForm.razorpayKeyId}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, razorpayKeyId: e.target.value }))}
              />
              <input
                type="password"
                placeholder="Razorpay Key Secret"
                value={settingsForm.razorpaySecret}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, razorpaySecret: e.target.value }))}
              />
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  await api.put(
                    '/admin/settings',
                    {
                      razorpay: {
                        keyId: settingsForm.razorpayKeyId,
                        secret: settingsForm.razorpaySecret,
                      },
                    },
                    token
                  );
                  setMessage('Razorpay keys updated');
                  loadAll();
                } catch (error) {
                  setMessage(error.message);
                }
              }}
            >
              Save Razorpay Keys
            </button>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-soft)', marginTop: '0.5rem' }}>
              {settings?.razorpay?.keyId ? `Key ID: ${settings.razorpay.keyId.slice(0, 8)}••••` : 'No Razorpay keys configured — orders will be confirmed directly without payment.'}
            </p>
          </div>
        )}

        {activeTab === 'Orders' && (() => {
          const ORDER_STATUSES = ['All', 'Pending Confirmation', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];
          const filteredOrders = orderFilter === 'All' ? orders : orders.filter((o) => o.status === orderFilter);
          const statusCounts = orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {});

          return (
            <div className="admin-block">
              <h2>Order Management</h2>

              {/* ── Filter Bar ── */}
              <div className="admin-order-filters">
                {ORDER_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`admin-order-filter-btn${orderFilter === status ? ' active' : ''}`}
                    onClick={() => setOrderFilter(status)}
                  >
                    {status}
                    <span className="admin-order-filter-count">
                      {status === 'All' ? orders.length : (statusCounts[status] || 0)}
                    </span>
                  </button>
                ))}
              </div>

              {!filteredOrders.length && <p style={{ marginTop: '1rem', color: '#6b7280' }}>No orders found.</p>}

              {filteredOrders.map((order) => {
                const isExpanded = expandedOrderId === order.id;
                const addr = order.address || {};
                const statusColorMap = {
                  'Pending Confirmation': '#b45309',
                  'Confirmed': '#1d4ed8',
                  'Packed': '#7c3aed',
                  'Shipped': '#0369a1',
                  'Out for Delivery': '#c2410c',
                  'Delivered': '#15803d',
                };
                const badgeColor = statusColorMap[order.status] || '#555';

                return (
                  <article key={order.id} className={`admin-order-card${isExpanded ? ' expanded' : ''}`}>
                    {/* ── Summary Row (always visible) ── */}
                    <div
                      className="admin-order-summary"
                      onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                    >
                      <div className="admin-order-summary-left">
                        <strong>{order.orderNumber || order.id}</strong>
                        <p>{order.customer?.name || 'Unknown'} · {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <div className="admin-order-summary-right">
                        <span className="admin-order-total">₹{Number(order.total).toLocaleString('en-IN')}</span>
                        <span className="admin-order-status-badge" style={{ background: badgeColor }}>{order.status}</span>
                      </div>
                      <span className="admin-order-chevron">{isExpanded ? '▲' : '▼'}</span>
                    </div>

                    {/* ── Expanded Detail Panel ── */}
                    {isExpanded && (
                      <div className="admin-order-detail">
                        <div className="admin-order-detail-grid">
                          {/* Customer Info */}
                          <div className="admin-order-detail-section">
                            <h4>Customer</h4>
                            <p><strong>Name:</strong> {order.customer?.name || '-'}</p>
                            <p><strong>Email:</strong> {order.customer?.email || '-'}</p>
                            <p><strong>User ID:</strong> {order.userId || '-'}</p>
                          </div>

                          {/* Shipping Address */}
                          <div className="admin-order-detail-section">
                            <h4>Shipping Address</h4>
                            {addr.line1 ? (
                              <>
                                <p>{addr.line1}</p>
                                {addr.line2 && <p>{addr.line2}</p>}
                                <p>{addr.city}, {addr.state} {addr.postalCode}</p>
                                <p>{addr.country}</p>
                              </>
                            ) : (
                              <p style={{ color: '#9ca3af' }}>No address provided</p>
                            )}
                          </div>

                          {/* Payment Info */}
                          <div className="admin-order-detail-section">
                            <h4>Payment</h4>
                            <p><strong>Method:</strong> {order.paymentMethod || '-'}</p>
                            <p><strong>Status:</strong> {order.paymentStatus || '-'}</p>
                            {order.paymentId && <p><strong>Payment ID:</strong> {order.paymentId}</p>}
                          </div>
                        </div>

                        {/* Products Table */}
                        <div className="admin-order-detail-section">
                          <h4>Products</h4>
                          <table className="admin-order-products-table">
                            <thead>
                              <tr>
                                <th>Image</th>
                                <th>Product</th>
                                <th>Size</th>
                                <th>Qty</th>
                                <th>Price</th>
                                <th>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(order.items || []).map((item, idx) => (
                                <tr key={idx}>
                                  <td>
                                    {item.image
                                      ? <img src={item.image} alt={item.name} className="admin-order-product-img" />
                                      : <span className="admin-order-no-img">—</span>
                                    }
                                  </td>
                                  <td>{item.name}</td>
                                  <td>{item.size || '-'}</td>
                                  <td>{item.quantity}</td>
                                  <td>₹{Number(item.price).toLocaleString('en-IN')}</td>
                                  <td>₹{Number(item.lineTotal || item.price * item.quantity).toLocaleString('en-IN')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Timeline */}
                        {order.timeline && order.timeline.length > 0 && (
                          <div className="admin-order-detail-section">
                            <h4>Timeline</h4>
                            <div className="admin-order-timeline">
                              {order.timeline.map((entry, idx) => (
                                <div key={idx} className="admin-order-timeline-entry">
                                  <span className="admin-order-timeline-dot" />
                                  <div>
                                    <strong>{entry.status}</strong>
                                    <p>{new Date(entry.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="admin-order-actions">
                          <select
                            value={order.status}
                            onChange={async (e) => {
                              try {
                                await api.put(`/admin/orders/${order.id}/status`, { status: e.target.value }, token);
                                setMessage(`Order ${order.orderNumber || order.id} → ${e.target.value}`);
                                loadAll();
                              } catch (err) {
                                setMessage(err.message);
                              }
                            }}
                          >
                            <option>Pending Confirmation</option>
                            <option>Confirmed</option>
                            <option>Packed</option>
                            <option>Shipped</option>
                            <option>Out for Delivery</option>
                            <option>Delivered</option>
                          </select>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const result = await api.post(`/admin/orders/${order.id}/send-status-email`, {}, token);
                                setMessage(result.message);
                              } catch (err) {
                                setMessage(err.message);
                              }
                            }}
                          >
                            Send Status Email
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          );
        })()}

        {activeTab === 'Users' && (
          <div className="admin-block">
            <h2>User Management</h2>
            <p>Total users: {userList.length}</p>
            {!userList.length && <p>No users found.</p>}
            {userList.map((user) => (
              <article key={user.id} className={`admin-list-item stacked${user.banned ? ' admin-user-banned' : ''}`}>
                <div className="admin-user-header">
                  <strong>
                    {user.name || 'Unnamed User'}
                    {user.role === 'admin' && <span className="admin-badge">Admin</span>}
                    {user.banned && <span className="admin-badge admin-badge--red">Banned</span>}
                    {user.tag && <span className="admin-badge admin-badge--blue">{user.tag}</span>}
                  </strong>
                  <p>{user.email || '-'}</p>
                  <p>Mobile: {user.mobile || '-'} | {user.country || '-'} | Pincode: {user.pincode || '-'}</p>
                  <p>Gender: {user.gender || '-'} | Age: {user.age ?? '-'} | Joined: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</p>
                </div>
                <div className="admin-user-actions">
                  <input
                    placeholder="Tag name"
                    defaultValue={user.tag || ''}
                    onBlur={async (e) => {
                      try {
                        await api.put(`/admin/users/${user.id}/tag`, { tag: e.target.value }, token);
                        loadAll();
                      } catch (err) {
                        setMessage(err.message);
                      }
                    }}
                    style={{ maxWidth: '140px' }}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const newRole = user.role === 'admin' ? 'customer' : 'admin';
                        await api.put(`/admin/users/${user.id}/role`, { role: newRole }, token);
                        setMessage(`${user.name} is now ${newRole}`);
                        loadAll();
                      } catch (err) {
                        setMessage(err.message);
                      }
                    }}
                  >
                    {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                  </button>
                  <button
                    type="button"
                    className={user.banned ? 'admin-btn-green' : 'admin-btn-danger'}
                    onClick={async () => {
                      try {
                        await api.put(`/admin/users/${user.id}/ban`, { banned: !user.banned }, token);
                        setMessage(user.banned ? `${user.name} unbanned` : `${user.name} banned`);
                        loadAll();
                      } catch (err) {
                        setMessage(err.message);
                      }
                    }}
                  >
                    {user.banned ? 'Unban' : 'Ban User'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {activeTab === 'Newsletter' && (
          <div className="admin-block">
            <h2>Newsletter Management</h2>
            <p>Subscribers: {newsletter.subscribers.length}</p>
            <input
              placeholder="Subject"
              value={newsletterForm.subject}
              onChange={(e) => setNewsletterForm((prev) => ({ ...prev, subject: e.target.value }))}
            />
            <textarea
              placeholder="Message"
              value={newsletterForm.body}
              onChange={(e) => setNewsletterForm((prev) => ({ ...prev, body: e.target.value }))}
            />
            <button
              type="button"
              onClick={async () => {
                const data = await api.post('/admin/newsletter/send', newsletterForm, token);
                setMessage(data.message);
                setNewsletterForm({ subject: '', body: '' });
                loadAll();
              }}
            >
              Send Newsletter
            </button>
            <h3>Mail Logs</h3>
            {newsletter.mails.map((mail) => (
              <article key={mail.id} className="admin-list-item stacked">
                <strong>{mail.subject}</strong>
                <p>{mail.recipientCount} recipients</p>
                <p>{new Date(mail.sentAt).toLocaleString()}</p>
              </article>
            ))}
          </div>
        )}

        {activeTab === 'Users & Subscribers Mail' && (() => {
          const audienceModes = [
            { key: 'both', label: 'All Users + Subscribers', icon: '👥' },
            { key: 'users', label: 'Users Only', icon: '👤' },
            { key: 'subscribers', label: 'Subscribers Only', icon: '📧' },
            { key: 'selected', label: 'Select Individual', icon: '🎯' },
          ];

          const allRecipientsList = [
            ...(userList || []).map((u) => ({ name: u.name, email: u.email, source: 'user' })),
            ...(newsletter.subscribers || []).filter((s) => !(userList || []).some((u) => u.email?.toLowerCase() === s.email?.toLowerCase())).map((s) => ({ name: s.email, email: s.email, source: 'subscriber' })),
          ];

          const searchLower = mailUserSearch.toLowerCase();
          const filteredRecipients = searchLower
            ? allRecipientsList.filter((r) => r.name?.toLowerCase().includes(searchLower) || r.email?.toLowerCase().includes(searchLower))
            : allRecipientsList;

          const recipientCount = mailForm.audience === 'selected'
            ? mailSelectedEmails.length
            : (mailRecipients.counts[mailForm.audience] || 0);

          const mailSending = false;

          return (
            <div className="admin-block">
              <h2>Email Communications</h2>
              <p className="admin-mail-subtitle">Send branded emails to your users and newsletter subscribers</p>

              {/* ── Audience Mode Tabs ── */}
              <div className="admin-mail-audience-tabs">
                {audienceModes.map((mode) => (
                  <button
                    key={mode.key}
                    type="button"
                    className={`admin-mail-audience-tab${mailForm.audience === mode.key ? ' active' : ''}`}
                    onClick={() => {
                      setMailForm((prev) => ({ ...prev, audience: mode.key }));
                      if (mode.key !== 'selected') setMailSelectedEmails([]);
                    }}
                  >
                    <span className="admin-mail-tab-icon">{mode.icon}</span>
                    <span>{mode.label}</span>
                    {mode.key !== 'selected' && (
                      <span className="admin-mail-tab-count">{mailRecipients.counts[mode.key] || 0}</span>
                    )}
                    {mode.key === 'selected' && mailSelectedEmails.length > 0 && (
                      <span className="admin-mail-tab-count">{mailSelectedEmails.length}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* ── User Picker (only for 'selected' audience) ── */}
              {mailForm.audience === 'selected' && (
                <div className="admin-mail-user-picker">
                  <div className="admin-mail-picker-header">
                    <h4>Select Recipients</h4>
                    <div className="admin-mail-picker-actions">
                      <button
                        type="button"
                        className="admin-mail-picker-action-btn"
                        onClick={() => setMailSelectedEmails(allRecipientsList.map((r) => r.email))}
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        className="admin-mail-picker-action-btn"
                        onClick={() => setMailSelectedEmails([])}
                      >
                        Clear
                      </button>
                      {mailSelectedEmails.length > 0 && (
                        <span className="admin-mail-selected-badge">
                          {mailSelectedEmails.length} selected
                        </span>
                      )}
                    </div>
                  </div>
                  <input
                    className="admin-mail-search"
                    placeholder="Search by name or email..."
                    value={mailUserSearch}
                    onChange={(e) => setMailUserSearch(e.target.value)}
                  />
                  <div className="admin-mail-user-list">
                    {filteredRecipients.map((recipient) => {
                      const isSelected = mailSelectedEmails.includes(recipient.email);
                      return (
                        <label
                          key={recipient.email}
                          className={`admin-mail-user-row${isSelected ? ' selected' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setMailSelectedEmails((prev) =>
                                isSelected
                                  ? prev.filter((e) => e !== recipient.email)
                                  : [...prev, recipient.email]
                              );
                            }}
                          />
                          <div className="admin-mail-user-info">
                            <strong>{recipient.name || 'Unnamed'}</strong>
                            <span>{recipient.email}</span>
                          </div>
                          <span className={`admin-mail-source-tag ${recipient.source}`}>
                            {recipient.source === 'user' ? 'User' : 'Subscriber'}
                          </span>
                        </label>
                      );
                    })}
                    {filteredRecipients.length === 0 && (
                      <p className="admin-mail-no-results">No recipients match your search</p>
                    )}
                  </div>
                </div>
              )}

              {/* ── Compose Section ── */}
              <div className="admin-mail-compose">
                <div className="admin-mail-compose-header">
                  <h4>Compose Email</h4>
                  <span className="admin-mail-recipient-count">
                    {recipientCount} {recipientCount === 1 ? 'recipient' : 'recipients'}
                  </span>
                </div>
                <input
                  className="admin-mail-input"
                  placeholder="Email Subject"
                  value={mailForm.subject}
                  onChange={(e) => setMailForm((prev) => ({ ...prev, subject: e.target.value }))}
                />
                <textarea
                  className="admin-mail-textarea"
                  placeholder="Write your message here... (HTML or plain text supported)"
                  value={mailForm.body}
                  onChange={(e) => setMailForm((prev) => ({ ...prev, body: e.target.value }))}
                  rows={6}
                />
                <div className="admin-mail-compose-footer">
                  <button
                    type="button"
                    className="admin-mail-send-btn"
                    disabled={!mailForm.subject || !mailForm.body || recipientCount === 0}
                    onClick={async () => {
                      try {
                        const payload = { ...mailForm };
                        if (mailForm.audience === 'selected') {
                          payload.emails = mailSelectedEmails;
                        }
                        const result = await api.post('/admin/mail/send', payload, token);
                        setMessage(result.message);
                        setMailForm((prev) => ({ ...prev, subject: '', body: '' }));
                        setMailSelectedEmails([]);
                        loadAll();
                      } catch (error) {
                        setMessage(error.message);
                      }
                    }}
                  >
                    Send Email →
                  </button>
                </div>
              </div>

              {/* ── Mail Logs ── */}
              <div className="admin-mail-logs">
                <h4>Mail History</h4>
                {(!newsletter.mails || newsletter.mails.length === 0) && (
                  <p style={{ color: '#9ca3af', fontSize: '0.75rem' }}>No emails sent yet.</p>
                )}
                {(newsletter.mails || []).map((mail) => {
                  const allSent = (mail.failedCount ?? 0) === 0;
                  return (
                    <article key={mail.id} className="admin-mail-log-card">
                      <div className="admin-mail-log-top">
                        <strong>{mail.subject}</strong>
                        <span className={`admin-mail-log-status ${allSent ? 'success' : 'partial'}`}>
                          {allSent ? '✓ Sent' : '⚠ Partial'}
                        </span>
                      </div>
                      <div className="admin-mail-log-meta">
                        <span>Audience: {mail.audience || 'subscribers'}</span>
                        <span>•</span>
                        <span>{mail.sentCount ?? mail.recipientCount}/{mail.recipientCount} delivered</span>
                        {(mail.failedCount ?? 0) > 0 && (
                          <><span>•</span><span className="admin-mail-log-failed">{mail.failedCount} failed</span></>
                        )}
                      </div>
                      <p className="admin-mail-log-date">{new Date(mail.sentAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </main>
    </section>
  );
}

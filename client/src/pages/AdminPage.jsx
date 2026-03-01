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
  });
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '' });
  const [seriesForm, setSeriesForm] = useState({ categoryId: '', name: '', slug: '' });
  const [slideForm, setSlideForm] = useState({
    title: '',
    subtitle: '',
    type: 'image',
    url: '',
    ctaLabel: '',
    ctaLink: '',
    productIds: [],
    layout: 2,
  });
  const [slideUploadState, setSlideUploadState] = useState({ loading: false, message: '' });
  const [postForm, setPostForm] = useState({ title: '', excerpt: '', image: '', body: '' });
  const [editingProductId, setEditingProductId] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
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
  const [logoVideo, setLogoVideo] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const logoFileRef = useRef(null);

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
              />
              <input
                type="number"
                placeholder="Stock"
                value={productForm.stock}
                onChange={(e) => setProductForm((prev) => ({ ...prev, stock: e.target.value }))}
              />
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
                  const payload = {
                    ...productForm,
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
                  setProductForm({ name: '', categoryId: '', seriesId: '', price: '', description: '', details: '', careInstructions: '', sizesCsv: 'S,M,L,XL', stock: 0, featured: false });
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
                        price: product.price || '',
                        description: product.description || '',
                        details: product.details || '',
                        careInstructions: product.careInstructions || '',
                        sizesCsv: (product.sizes || []).join(','),
                        stock: product.stock || 0,
                        featured: product.featured || false,
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

            <h3>Add Series</h3>
            <div className="inline-form">
              <select
                value={seriesForm.categoryId}
                onChange={(e) => setSeriesForm((prev) => ({ ...prev, categoryId: e.target.value }))}
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
                  await api.post(`/admin/categories/${seriesForm.categoryId}/series`, seriesForm, token);
                  setSeriesForm({ categoryId: '', name: '', slug: '' });
                  loadAll();
                }}
              >
                Add Series
              </button>
            </div>

            {categories.map((category) => (
              <article key={category.id} className="admin-list-item stacked">
                <strong>{category.name}</strong>
                <small>{category.slug}</small>
                <div className="series-list">
                  {category.series.map((series) => (
                    <span key={series.id}>
                      {series.name}
                      <button
                        type="button"
                        style={{ marginLeft: 4, fontSize: '0.7rem', padding: '1px 6px', background: '#c00' }}
                        onClick={async () => {
                          await api.del(`/admin/categories/${category.id}/series/${series.id}`, token);
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
              <select value={slideForm.type} onChange={(e) => setSlideForm((prev) => ({ ...prev, type: e.target.value }))}>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="products">Product Grid</option>
              </select>

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
                    value={slideForm.layout}
                    onChange={(e) => setSlideForm((prev) => ({ ...prev, layout: Number(e.target.value) }))}
                  >
                    <option value={2}>2 Products</option>
                    <option value={3}>3 Products</option>
                  </select>
                </>
              )}
            </div>

            {slideForm.type === 'products' && (
              <div className="admin-product-picker">
                <p className="admin-image-uploader-label">
                  Select Products ({slideForm.productIds.length}/{slideForm.layout})
                </p>
                <div className="admin-product-picker-grid">
                  {products.map((product) => {
                    const isSelected = slideForm.productIds.includes(product.id);
                    return (
                      <label
                        key={product.id}
                        className={`admin-product-picker-item${isSelected ? ' selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSlideForm((prev) => {
                              const ids = prev.productIds.includes(product.id)
                                ? prev.productIds.filter((id) => id !== product.id)
                                : prev.productIds.length < prev.layout
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
                  if (editingSlideId) {
                    await api.put(`/admin/slides/${editingSlideId}`, slideForm, token);
                    setMessage('Slide updated');
                    setEditingSlideId(null);
                  } else {
                    await api.post('/admin/slides', slideForm, token);
                    setMessage('Slide added');
                  }
                  setSlideForm({
                    title: '',
                    subtitle: '',
                    type: 'image',
                    url: '',
                    ctaLabel: '',
                    ctaLink: '',
                    productIds: [],
                    layout: 2,
                  });
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
                  setSlideForm({ title: '', subtitle: '', type: 'image', url: '', ctaLabel: '', ctaLink: '', productIds: [], layout: 2 });
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
                  <p>{slide.type}{slide.type === 'products' ? ` · ${slide.layout || 2} products` : ''}</p>
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
                      productIds: slide.productIds || [],
                      layout: slide.layout || 2,
                    });
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
            <input
              placeholder="Image URL"
              value={postForm.image}
              onChange={(e) => setPostForm((prev) => ({ ...prev, image: e.target.value }))}
            />
            <textarea
              placeholder="Body"
              value={postForm.body}
              onChange={(e) => setPostForm((prev) => ({ ...prev, body: e.target.value }))}
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  if (editingPostId) {
                    await api.put(`/admin/hb-productions/${editingPostId}`, postForm, token);
                    setMessage('Blog post updated');
                    setEditingPostId(null);
                  } else {
                    await api.post('/admin/hb-productions', postForm, token);
                    setMessage('Blog post added');
                  }
                  setPostForm({ title: '', excerpt: '', image: '', body: '' });
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
                  setPostForm({ title: '', excerpt: '', image: '', body: '' });
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
                      setEditingPostId(post.id);
                      setPostForm({
                        title: post.title || '',
                        excerpt: post.excerpt || '',
                        image: post.image || '',
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

        {activeTab === 'Orders' && (
          <div className="admin-block">
            <h2>Order Management</h2>
            {!orders.length && <p>No orders yet.</p>}
            {orders.map((order) => (
              <article key={order.id} className="admin-order-card">
                <div className="admin-order-top">
                  <div>
                    <strong>{order.orderNumber || order.id}</strong>
                    <p>{order.customer?.name} · {order.customer?.email}</p>
                    <p>{new Date(order.createdAt).toLocaleDateString()} · ₹{Number(order.total).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="admin-order-items">
                    {(order.items || []).map((item, idx) => (
                      <span key={idx}>{item.name} x{item.quantity}</span>
                    ))}
                  </div>
                </div>
                <div className="admin-order-bottom">
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
              </article>
            ))}
          </div>
        )}

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

        {activeTab === 'Users & Subscribers Mail' && (
          <div className="admin-block">
            <h2>Send Mail to Users and Newsletter Subscribers</h2>
            <p>
              Users: {mailRecipients.counts.users} | Newsletter Subscribers: {mailRecipients.counts.subscribers} | Unique
              Total: {mailRecipients.counts.both}
            </p>
            <div className="admin-form-grid">
              <select
                value={mailForm.audience}
                onChange={(e) => setMailForm((prev) => ({ ...prev, audience: e.target.value }))}
              >
                <option value="both">Users + Newsletter Subscribers</option>
                <option value="users">Users only</option>
                <option value="subscribers">Newsletter subscribers only</option>
              </select>
              <input
                placeholder="Subject"
                value={mailForm.subject}
                onChange={(e) => setMailForm((prev) => ({ ...prev, subject: e.target.value }))}
              />
              <input
                disabled
                value={`Recipients: ${mailRecipients.counts[mailForm.audience] || 0}`}
                readOnly
              />
            </div>
            <textarea
              placeholder="Message (HTML/plain text)"
              value={mailForm.body}
              onChange={(e) => setMailForm((prev) => ({ ...prev, body: e.target.value }))}
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  const result = await api.post('/admin/mail/send', mailForm, token);
                  setMessage(result.message);
                  setMailForm((prev) => ({ ...prev, subject: '', body: '' }));
                  loadAll();
                } catch (error) {
                  setMessage(error.message);
                }
              }}
            >
              Send Mail
            </button>
            <h3>Recent Mail Logs</h3>
            {newsletter.mails.map((mail) => (
              <article key={mail.id} className="admin-list-item stacked">
                <strong>{mail.subject}</strong>
                <p>Audience: {mail.audience || 'subscribers'}</p>
                <p>
                  Sent: {mail.sentCount ?? mail.recipientCount}/{mail.recipientCount} | Failed: {mail.failedCount ?? 0}
                </p>
                <p>{new Date(mail.sentAt).toLocaleString()}</p>
              </article>
            ))}
          </div>
        )}
      </main>
    </section>
  );
}

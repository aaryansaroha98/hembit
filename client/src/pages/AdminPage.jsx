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
  'Settings',
  'Users',
  'Orders',
  'Newsletter',
  'Users & Subscribers Mail',
];

export function AdminPage() {
  const { token } = useAuth();
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
    slug: '',
    categoryId: '',
    seriesId: '',
    price: '',
    description: '',
    details: '',
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
    ctaLabel: 'Discover',
    ctaLink: '/shop',
  });
  const [slideUploadState, setSlideUploadState] = useState({ loading: false, message: '' });
  const [postForm, setPostForm] = useState({ title: '', excerpt: '', image: '', body: '' });
  const [newsletterForm, setNewsletterForm] = useState({ subject: '', body: '' });
  const [settingsForm, setSettingsForm] = useState({
    supportEmail: '',
    contactNumber: '',
    contactHours: '',
  });
  const [mailForm, setMailForm] = useState({
    audience: 'both',
    subject: '',
    body: '',
  });

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
    });
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
            <h2>Add Product</h2>
            <div className="admin-form-grid">
              <input
                placeholder="Name"
                value={productForm.name}
                onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <input
                placeholder="Slug"
                value={productForm.slug}
                onChange={(e) => setProductForm((prev) => ({ ...prev, slug: e.target.value }))}
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
                  await api.post(
                    '/admin/products',
                    {
                      ...productForm,
                      images: uploadedImages,
                      sizes: productForm.sizesCsv
                        .split(',')
                        .map((item) => item.trim())
                        .filter(Boolean),
                    },
                    token
                  );
                  setMessage('Product added');
                  setProductForm({
                    name: '',
                    slug: '',
                    categoryId: '',
                    seriesId: '',
                    price: '',
                    description: '',
                    details: '',
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
              Add Product
            </button>

            <h3>Existing Products</h3>
            {products.map((product) => (
              <article key={product.id} className="admin-list-item">
                <div>
                  <strong>{product.name}</strong>
                  <p>{product.slug}</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await api.del(`/admin/products/${product.id}`, token);
                    loadAll();
                  }}
                >
                  Delete
                </button>
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
                  await api.post('/admin/categories', categoryForm, token);
                  setCategoryForm({ name: '', slug: '' });
                  loadAll();
                }}
              >
                Add Category
              </button>
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
                    <span key={series.id}>{series.name}</span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await api.del(`/admin/categories/${category.id}`, token);
                    loadAll();
                  }}
                >
                  Delete Category
                </button>
              </article>
            ))}
          </div>
        )}

        {activeTab === 'Slides' && (
          <div className="admin-block">
            <h2>Homepage Slides</h2>
            <div className="admin-form-grid">
              <input
                placeholder="Title"
                value={slideForm.title}
                onChange={(e) => setSlideForm((prev) => ({ ...prev, title: e.target.value }))}
              />
              <input
                placeholder="Subtitle"
                value={slideForm.subtitle}
                onChange={(e) => setSlideForm((prev) => ({ ...prev, subtitle: e.target.value }))}
              />
              <select value={slideForm.type} onChange={(e) => setSlideForm((prev) => ({ ...prev, type: e.target.value }))}>
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
              <input
                placeholder="Media URL"
                value={slideForm.url}
                onChange={(e) => setSlideForm((prev) => ({ ...prev, url: e.target.value }))}
              />
              <input
                placeholder="CTA Label"
                value={slideForm.ctaLabel}
                onChange={(e) => setSlideForm((prev) => ({ ...prev, ctaLabel: e.target.value }))}
              />
              <input
                placeholder="CTA Link"
                value={slideForm.ctaLink}
                onChange={(e) => setSlideForm((prev) => ({ ...prev, ctaLink: e.target.value }))}
              />
            </div>
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
            {slideUploadState.message && <p className="form-message">{slideUploadState.message}</p>}
            <button
              type="button"
              onClick={async () => {
                await api.post('/admin/slides', slideForm, token);
                setSlideForm({
                  title: '',
                  subtitle: '',
                  type: 'image',
                  url: '',
                  ctaLabel: 'Discover',
                  ctaLink: '/shop',
                });
                loadAll();
              }}
            >
              Add Slide
            </button>

            {slides.map((slide) => (
              <article key={slide.id} className="admin-list-item">
                <div>
                  <strong>{slide.title}</strong>
                  <p>{slide.type}</p>
                </div>
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
            <h2>HB Productions Blogs</h2>
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
                await api.post('/admin/hb-productions', postForm, token);
                setPostForm({ title: '', excerpt: '', image: '', body: '' });
                loadAll();
              }}
            >
              Add Blog
            </button>

            {posts.map((post) => (
              <article key={post.id} className="admin-list-item">
                <div>
                  <strong>{post.title}</strong>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await api.del(`/admin/hb-productions/${post.id}`, token);
                    loadAll();
                  }}
                >
                  Delete
                </button>
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
          </div>
        )}

        {activeTab === 'Orders' && (
          <div className="admin-block">
            <h2>Order Management</h2>
            {orders.map((order) => (
              <article key={order.id} className="admin-list-item stacked">
                <strong>{order.id}</strong>
                <p>{order.customer?.email}</p>
                <p>{order.status}</p>
                <select
                  value={order.status}
                  onChange={async (e) => {
                    await api.put(`/admin/orders/${order.id}/status`, { status: e.target.value }, token);
                    loadAll();
                  }}
                >
                  <option>Pending Confirmation</option>
                  <option>Confirmed</option>
                  <option>Packed</option>
                  <option>Shipped</option>
                  <option>Out for Delivery</option>
                  <option>Delivered</option>
                </select>
              </article>
            ))}
          </div>
        )}

        {activeTab === 'Users' && (
          <div className="admin-block">
            <h2>Users</h2>
            <p>Total users: {userList.length}</p>
            {!userList.length && <p>No users found.</p>}
            {userList.map((user) => (
              <article key={user.id} className="admin-list-item stacked">
                <strong>
                  {user.name || 'Unnamed User'} {user.role === 'admin' ? '(Admin)' : ''}
                </strong>
                <p>{user.email || '-'}</p>
                <p>Mobile: {user.mobile || '-'}</p>
                <p>
                  Country: {user.country || '-'} | Pincode: {user.pincode || '-'}
                </p>
                <p>
                  Gender: {user.gender || '-'} | Age: {user.age ?? '-'}
                </p>
                <p>Joined: {user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}</p>
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

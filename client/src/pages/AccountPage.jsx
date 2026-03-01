import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

function formatPrice(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Chandigarh', 'Jammu & Kashmir', 'Ladakh',
];

const emptyAddress = {
  line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India', isDefault: false,
};

export function AccountPage() {
  const { user, token, signout, refreshUser, isAdmin } = useAuth();

  const [tab, setTab] = useState('overview');
  const [profileView, setProfileView] = useState('menu');
  const [orders, setOrders] = useState([]);
  const [profileForm, setProfileForm] = useState({
    firstName: '', lastName: '', mobile: '', country: '', pincode: '', gender: '', age: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  });
  const [addressForm, setAddressForm] = useState({ ...emptyAddress });
  const [editingAddrId, setEditingAddrId] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) {
      api.get('/checkout/my-orders', token)
        .then((r) => setOrders(r.orders))
        .catch(() => setOrders([]));
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      const [firstName = '', ...rest] = (user.name || '').split(' ');
      setProfileForm({
        firstName,
        lastName: rest.join(' '),
        mobile: user.mobile || '',
        country: user.country || '',
        pincode: user.pincode || '',
        gender: user.gender || '',
        age: user.age || '',
      });
    }
  }, [user]);

  const flash = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 3000); };

  const saveProfile = async () => {
    try {
      const fullName = [profileForm.firstName, profileForm.lastName].filter(Boolean).join(' ');
      const data = await api.put('/auth/profile', {
        name: fullName, mobile: profileForm.mobile, country: profileForm.country,
        pincode: profileForm.pincode, gender: profileForm.gender, age: profileForm.age,
      }, token);
      flash(data.message);
      refreshUser();
      setProfileView('menu');
    } catch (err) { flash(err.message); }
  };

  const changePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      flash('Passwords do not match'); return;
    }
    try {
      const data = await api.put('/auth/password', {
        currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword,
      }, token);
      flash(data.message);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setProfileView('menu');
    } catch (err) { flash(err.message); }
  };

  const saveAddress = async () => {
    try {
      if (editingAddrId) {
        await api.put(`/auth/address/${editingAddrId}`, addressForm, token);
      } else {
        await api.post('/auth/address', addressForm, token);
      }
      flash(editingAddrId ? 'Address updated' : 'Address added');
      refreshUser();
      setAddressForm({ ...emptyAddress });
      setEditingAddrId(null);
      setProfileView('addresses');
    } catch (err) { flash(err.message); }
  };

  const deleteAddress = async (id) => {
    try {
      await api.del(`/auth/address/${id}`, token);
      flash('Address deleted');
      refreshUser();
    } catch (err) { flash(err.message); }
  };

  const startEditAddress = (addr) => {
    setAddressForm({ ...addr });
    setEditingAddrId(addr.id);
    setProfileView('address-form');
  };

  const addresses = user?.addresses || [];

  return (
    <section className="myaccount">
      {/* Tabs */}
      <nav className="myaccount-tabs">
        {['overview', 'orders', 'profile'].map((t) => (
          <button
            key={t}
            type="button"
            className={`myaccount-tab${tab === t ? ' myaccount-tab--active' : ''}`}
            onClick={() => { setTab(t); setProfileView('menu'); setMessage(''); }}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </nav>

      {message && <p className="myaccount-flash">{message}</p>}

      {/* ─── OVERVIEW ─── */}
      {tab === 'overview' && (
        <div className="myaccount-section">
          <h2 className="myaccount-greeting">Welcome back, {user?.name?.split(' ')[0] || 'there'}</h2>
          <p className="myaccount-greeting-sub">
            From your account you can view your recent orders, manage your addresses and edit your account information.
          </p>
          <div className="myaccount-overview-grid">
            <div className="myaccount-overview-card" onClick={() => setTab('orders')} role="button" tabIndex={0}>
              <h3>Orders</h3>
              <p>{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="myaccount-overview-card" onClick={() => { setTab('profile'); setProfileView('addresses'); }} role="button" tabIndex={0}>
              <h3>Address Book</h3>
              <p>{addresses.length} address{addresses.length !== 1 ? 'es' : ''}</p>
            </div>
            <div className="myaccount-overview-card" onClick={() => { setTab('profile'); setProfileView('info'); }} role="button" tabIndex={0}>
              <h3>Account Info</h3>
              <p>Edit your details</p>
            </div>
            {isAdmin && (
              <Link to="/admin" className="myaccount-overview-card myaccount-overview-card--admin">
                <h3>Admin Panel</h3>
                <p>Manage your store</p>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ─── ORDERS ─── */}
      {tab === 'orders' && (
        <div className="myaccount-section">
          {!orders.length && <p className="myaccount-empty">You haven't placed any orders yet.</p>}
          {orders.map((order) => (
            <article key={order.id} className="myaccount-order">
              <div className="myaccount-order-header">
                <div>
                  <span className="myaccount-order-id">{order.id}</span>
                  <span className="myaccount-order-date">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <span className={`myaccount-status myaccount-status--${order.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                  {order.status}
                </span>
              </div>
              <ul className="myaccount-order-items">
                {order.items.map((item) => (
                  <li key={`${order.id}-${item.productId}-${item.size}`}>
                    <span className="myaccount-item-name">{item.name}</span>
                    <span className="myaccount-item-meta">
                      {item.size && `Size ${item.size}`}{item.size && ' · '}Qty {item.quantity}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="myaccount-order-footer">
                <span>Total: {formatPrice(order.total)}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ─── PROFILE ─── */}
      {tab === 'profile' && (
        <div className="myaccount-section">

          {/* Menu */}
          {profileView === 'menu' && (
            <>
              <button type="button" className="myaccount-menu-row" onClick={() => setProfileView('info')}>
                <span>ACCOUNT INFORMATION</span>
                <span className="myaccount-chevron">›</span>
              </button>
              <button type="button" className="myaccount-menu-row" onClick={() => setProfileView('password')}>
                <span>PASSWORD</span>
                <span className="myaccount-chevron">›</span>
              </button>
              <button type="button" className="myaccount-menu-row" onClick={() => setProfileView('addresses')}>
                <span>ADDRESS BOOK</span>
                <span className="myaccount-chevron">›</span>
              </button>
              <button type="button" className="myaccount-logout" onClick={signout}>
                LOGOUT
              </button>
            </>
          )}

          {/* Account Information */}
          {profileView === 'info' && (
            <div className="myaccount-subpage">
              <button type="button" className="myaccount-back" onClick={() => setProfileView('menu')}>‹ PROFILE</button>
              <h2 className="myaccount-subpage-title">ACCOUNT INFORMATION</h2>
              <div className="myaccount-form">
                <div className="myaccount-field">
                  <label>GENDER</label>
                  <div className="myaccount-radio-row">
                    {['male', 'female'].map((g) => (
                      <label key={g} className="myaccount-radio">
                        <input type="radio" name="gender" checked={profileForm.gender === g} onChange={() => setProfileForm((p) => ({ ...p, gender: g }))} />
                        {g === 'male' ? 'MR' : 'MS'}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="myaccount-field">
                  <label>FIRST NAME *</label>
                  <input value={profileForm.firstName || ''} onChange={(e) => setProfileForm((p) => ({ ...p, firstName: e.target.value }))} />
                </div>
                <div className="myaccount-field">
                  <label>LAST NAME</label>
                  <input value={profileForm.lastName || ''} onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))} />
                </div>
                <div className="myaccount-field">
                  <label>AGE</label>
                  <input type="number" value={profileForm.age || ''} onChange={(e) => setProfileForm((p) => ({ ...p, age: e.target.value }))} />
                </div>
                <div className="myaccount-field">
                  <label>PHONE NUMBER</label>
                  <input value={profileForm.mobile || ''} onChange={(e) => setProfileForm((p) => ({ ...p, mobile: e.target.value }))} />
                </div>
                <div className="myaccount-field">
                  <label>COUNTRY</label>
                  <input value={profileForm.country || ''} onChange={(e) => setProfileForm((p) => ({ ...p, country: e.target.value }))} />
                </div>
                <div className="myaccount-field">
                  <label>PIN CODE</label>
                  <input value={profileForm.pincode || ''} onChange={(e) => setProfileForm((p) => ({ ...p, pincode: e.target.value }))} />
                </div>
                <div className="myaccount-field">
                  <label>EMAIL</label>
                  <p className="myaccount-static">{user?.email}</p>
                </div>
                <div className="myaccount-form-actions">
                  <button type="button" className="myaccount-btn myaccount-btn--outline" onClick={() => setProfileView('menu')}>CANCEL</button>
                  <button type="button" className="myaccount-btn myaccount-btn--filled" onClick={saveProfile}>SAVE</button>
                </div>
              </div>
            </div>
          )}

          {/* Password */}
          {profileView === 'password' && (
            <div className="myaccount-subpage">
              <button type="button" className="myaccount-back" onClick={() => setProfileView('menu')}>‹ PROFILE</button>
              <h2 className="myaccount-subpage-title">PASSWORD</h2>
              <div className="myaccount-form">
                <div className="myaccount-field">
                  <label>CURRENT PASSWORD *</label>
                  <input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))} />
                </div>
                <div className="myaccount-field">
                  <label>NEW PASSWORD *</label>
                  <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))} />
                </div>
                <div className="myaccount-field">
                  <label>CONFIRM NEW PASSWORD *</label>
                  <input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))} />
                </div>
                <div className="myaccount-form-actions">
                  <button type="button" className="myaccount-btn myaccount-btn--outline" onClick={() => setProfileView('menu')}>CANCEL</button>
                  <button type="button" className="myaccount-btn myaccount-btn--filled" onClick={changePassword}>SAVE</button>
                </div>
              </div>
            </div>
          )}

          {/* Address Book */}
          {profileView === 'addresses' && (
            <div className="myaccount-subpage">
              <button type="button" className="myaccount-back" onClick={() => setProfileView('menu')}>‹ PROFILE</button>
              <h2 className="myaccount-subpage-title">ADDRESS BOOK</h2>
              {addresses.length === 0 && <p className="myaccount-empty">No addresses saved yet.</p>}
              {addresses.map((addr) => (
                <div key={addr.id} className="myaccount-address-card">
                  <div className="myaccount-address-info">
                    {addr.isDefault && <span className="myaccount-default-tag">(DEFAULT)</span>}
                    <p>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                    <p>{addr.city}, {addr.state} {addr.postalCode}</p>
                    <p>{addr.country}</p>
                  </div>
                  <div className="myaccount-address-actions">
                    <button type="button" onClick={() => startEditAddress(addr)}>EDIT</button>
                    <button type="button" onClick={() => deleteAddress(addr.id)}>DELETE</button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="myaccount-btn myaccount-btn--filled myaccount-btn--full"
                onClick={() => { setAddressForm({ ...emptyAddress }); setEditingAddrId(null); setProfileView('address-form'); }}
              >
                ADD NEW ADDRESS
              </button>
            </div>
          )}

          {/* Address Form */}
          {profileView === 'address-form' && (
            <div className="myaccount-subpage">
              <button type="button" className="myaccount-back" onClick={() => setProfileView('addresses')}>‹ ADDRESS BOOK</button>
              <h2 className="myaccount-subpage-title">{editingAddrId ? 'EDIT ADDRESS' : 'ADD NEW ADDRESS'}</h2>
              <div className="myaccount-form">
                <div className="myaccount-field">
                  <label>COUNTRY *</label>
                  <input value={addressForm.country} onChange={(e) => setAddressForm((p) => ({ ...p, country: e.target.value }))} />
                </div>
                <div className="myaccount-field">
                  <label>ADDRESS LINE 1 *</label>
                  <input value={addressForm.line1} onChange={(e) => setAddressForm((p) => ({ ...p, line1: e.target.value }))} />
                </div>
                <div className="myaccount-field">
                  <label>ADDRESS LINE 2</label>
                  <input value={addressForm.line2} onChange={(e) => setAddressForm((p) => ({ ...p, line2: e.target.value }))} />
                </div>
                <div className="myaccount-field">
                  <label>STATE *</label>
                  <select value={addressForm.state} onChange={(e) => setAddressForm((p) => ({ ...p, state: e.target.value }))}>
                    <option value="">Select state</option>
                    {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="myaccount-field">
                  <label>ZIP CODE *</label>
                  <input value={addressForm.postalCode} onChange={(e) => setAddressForm((p) => ({ ...p, postalCode: e.target.value }))} />
                </div>
                <div className="myaccount-field">
                  <label>CITY *</label>
                  <input value={addressForm.city} onChange={(e) => setAddressForm((p) => ({ ...p, city: e.target.value }))} />
                </div>
                <label className="myaccount-checkbox">
                  <input type="checkbox" checked={addressForm.isDefault || false} onChange={(e) => setAddressForm((p) => ({ ...p, isDefault: e.target.checked }))} />
                  MAKE THIS MY DEFAULT ADDRESS
                </label>
                <div className="myaccount-form-actions">
                  <button type="button" className="myaccount-btn myaccount-btn--outline" onClick={() => setProfileView('addresses')}>CANCEL</button>
                  <button type="button" className="myaccount-btn myaccount-btn--filled" onClick={saveAddress}>SAVE</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

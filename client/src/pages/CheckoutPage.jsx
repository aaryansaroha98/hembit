import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Chandigarh', 'Jammu & Kashmir', 'Ladakh',
];

function formatPrice(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(value);
}

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { token, user, refreshUser } = useAuth();
  const { items, totals, clear } = useCart();

  const addresses = user?.addresses || [];
  const [selectedAddrId, setSelectedAddrId] = useState(null);
  const [showNewAddr, setShowNewAddr] = useState(false);
  const [address, setAddress] = useState({
    line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India',
  });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddrId) {
      const def = addresses.find((a) => a.isDefault) || addresses[0];
      setSelectedAddrId(def.id);
    }
  }, [addresses, selectedAddrId]);

  useEffect(() => { refreshUser(); }, []);

  const getShippingAddress = () => {
    if (showNewAddr || addresses.length === 0) return address;
    return addresses.find((a) => a.id === selectedAddrId) || address;
  };

  const handlePlaceOrder = async () => {
    const shipping = getShippingAddress();
    if (!shipping.line1 || !shipping.city || !shipping.state || !shipping.postalCode) {
      setError('Please fill in all required address fields.');
      return;
    }
    if (!items.length) { setError('Your cart is empty.'); return; }

    setProcessing(true);
    setError('');

    try {
      const created = await api.post('/checkout/create-order', { items, address: shipping }, token);

      const loaded = await loadRazorpayScript();
      if (created.razorpay?.configured && loaded && window.Razorpay) {
        const options = {
          key: created.razorpay.keyId,
          amount: created.order.total * 100,
          currency: 'INR',
          name: 'HEMBIT',
          description: `Order ${created.order.orderNumber || created.order.id}`,
          handler: async (response) => {
            await api.post('/checkout/confirm-payment',
              { orderId: created.order.id, paymentId: response.razorpay_payment_id }, token);
            clear();
            navigate(`/order-confirmed/${created.order.id}`);
          },
          prefill: { name: user?.name || '', email: user?.email || '' },
          modal: { ondismiss: () => setProcessing(false) },
        };
        new window.Razorpay(options).open();
        return;
      }

      await api.post('/checkout/confirm-payment',
        { orderId: created.order.id, paymentId: 'direct_payment' }, token);
      clear();
      navigate(`/order-confirmed/${created.order.id}`);
    } catch (err) {
      setError(err.message);
      setProcessing(false);
    }
  };

  return (
    <section className="section-pad co-page">
      <div className="co-main">
        <div className="co-section">
          <h1 className="co-heading">Shipping Address</h1>

          {addresses.length > 0 && !showNewAddr && (
            <div className="co-addr-list">
              {addresses.map((addr) => (
                <label key={addr.id} className={`co-addr-card${selectedAddrId === addr.id ? ' co-addr-card--active' : ''}`}>
                  <input type="radio" name="shipping-addr" checked={selectedAddrId === addr.id}
                    onChange={() => setSelectedAddrId(addr.id)} className="co-addr-radio" />
                  <div className="co-addr-body">
                    <p className="co-addr-line">{addr.line1}</p>
                    {addr.line2 && <p className="co-addr-line">{addr.line2}</p>}
                    <p className="co-addr-line">{addr.city}, {addr.state} {addr.postalCode}</p>
                    <p className="co-addr-line">{addr.country}</p>
                    {addr.isDefault && <span className="co-addr-badge">Default</span>}
                  </div>
                </label>
              ))}
              <button type="button" className="co-link-btn" onClick={() => setShowNewAddr(true)}>
                + Use a different address
              </button>
            </div>
          )}

          {(showNewAddr || addresses.length === 0) && (
            <div className="co-addr-form">
              {addresses.length > 0 && (
                <button type="button" className="co-link-btn" onClick={() => setShowNewAddr(false)}>
                  ← Back to saved addresses
                </button>
              )}
              <input placeholder="Address line 1 *" value={address.line1}
                onChange={(e) => setAddress((p) => ({ ...p, line1: e.target.value }))} className="co-input" />
              <input placeholder="Address line 2" value={address.line2}
                onChange={(e) => setAddress((p) => ({ ...p, line2: e.target.value }))} className="co-input" />
              <div className="co-input-row">
                <input placeholder="City *" value={address.city}
                  onChange={(e) => setAddress((p) => ({ ...p, city: e.target.value }))} className="co-input" />
                <select value={address.state}
                  onChange={(e) => setAddress((p) => ({ ...p, state: e.target.value }))} className="co-input">
                  <option value="">State *</option>
                  {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="co-input-row">
                <input placeholder="Postal Code *" value={address.postalCode}
                  onChange={(e) => setAddress((p) => ({ ...p, postalCode: e.target.value }))} className="co-input" />
                <input placeholder="Country" value={address.country}
                  onChange={(e) => setAddress((p) => ({ ...p, country: e.target.value }))} className="co-input" />
              </div>
            </div>
          )}
        </div>

        <div className="co-section">
          <h2 className="co-heading co-heading--sm">Contact</h2>
          <div className="co-contact-row">
            <span>{user?.email}</span>
            {user?.mobile && <span>{user.mobile}</span>}
          </div>
        </div>
      </div>

      <aside className="co-summary">
        <h2 className="co-summary-title">Order Summary</h2>
        <div className="co-summary-items">
          {items.map((item) => (
            <div key={`${item.productId}-${item.size}`} className="co-item">
              <div className="co-item-img">
                {item.image ? <img src={item.image} alt={item.name} /> : <div className="co-item-placeholder" />}
                <span className="co-item-qty">{item.quantity}</span>
              </div>
              <div className="co-item-info">
                <p className="co-item-name">{item.name}</p>
                <p className="co-item-meta">Size: {item.size}</p>
              </div>
              <span className="co-item-price">{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="co-summary-totals">
          <div className="co-summary-row"><span>Subtotal</span><span>{formatPrice(totals.subtotal)}</span></div>
          <div className="co-summary-row"><span>Shipping</span><span>Complimentary</span></div>
          <div className="co-summary-row co-summary-row--total"><span>Total</span><span>{formatPrice(totals.total)}</span></div>
        </div>
        {error && <p className="co-error">{error}</p>}
        <button type="button" className="co-pay-btn" onClick={handlePlaceOrder}
          disabled={processing || !items.length}>
          {processing ? 'Processing...' : 'Place Order'}
        </button>
        <p className="co-secure-note">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Secure checkout
        </p>
      </aside>
    </section>
  );
}

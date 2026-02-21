import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { items, totals, clear } = useCart();
  const [address, setAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
  });
  const [message, setMessage] = useState('');

  const handlePay = async () => {
    try {
      const created = await api.post('/checkout/create-order', { items, address }, token);

      const loaded = await loadRazorpayScript();
      if (created.razorpay.configured && loaded && window.Razorpay) {
        const options = {
          key: created.razorpay.keyId,
          amount: created.order.total * 100,
          currency: 'INR',
          name: 'HEMBIT',
          description: `Order ${created.order.id}`,
          handler: async (response) => {
            const confirmation = await api.post(
              '/checkout/confirm-payment',
              { orderId: created.order.id, paymentId: response.razorpay_payment_id },
              token
            );
            setMessage(confirmation.message);
            clear();
            setTimeout(() => navigate('/account'), 1000);
          },
          prefill: {
            name: user?.name || '',
            email: user?.email || '',
          },
        };
        const razorpay = new window.Razorpay(options);
        razorpay.open();
        return;
      }

      const confirmation = await api.post(
        '/checkout/confirm-payment',
        { orderId: created.order.id, paymentId: 'manual_dev_mode' },
        token
      );
      setMessage(confirmation.message);
      clear();
      setTimeout(() => navigate('/account'), 1000);
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <section className="section-pad checkout-layout">
      <div>
        <h1 className="panel-title">Checkout</h1>
        <div className="address-grid">
          <input
            placeholder="Address line 1"
            value={address.line1}
            onChange={(e) => setAddress((prev) => ({ ...prev, line1: e.target.value }))}
          />
          <input
            placeholder="Address line 2"
            value={address.line2}
            onChange={(e) => setAddress((prev) => ({ ...prev, line2: e.target.value }))}
          />
          <input
            placeholder="City"
            value={address.city}
            onChange={(e) => setAddress((prev) => ({ ...prev, city: e.target.value }))}
          />
          <input
            placeholder="State"
            value={address.state}
            onChange={(e) => setAddress((prev) => ({ ...prev, state: e.target.value }))}
          />
          <input
            placeholder="Postal Code"
            value={address.postalCode}
            onChange={(e) => setAddress((prev) => ({ ...prev, postalCode: e.target.value }))}
          />
          <input
            placeholder="Country"
            value={address.country}
            onChange={(e) => setAddress((prev) => ({ ...prev, country: e.target.value }))}
          />
        </div>
      </div>

      <aside className="cart-summary">
        <h2>Payment</h2>
        <p>Items: {items.length}</p>
        <strong>Total: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totals.total)}</strong>
        <button type="button" className="primary-btn" onClick={handlePay} disabled={!items.length}>
          PAY
        </button>
        {message && <p className="form-message">{message}</p>}
      </aside>
    </section>
  );
}

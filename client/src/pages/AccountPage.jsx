import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

function formatPrice(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function AccountPage() {
  const { user, token, signout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [address, setAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    api
      .get('/checkout/my-orders', token)
      .then((response) => setOrders(response.orders))
      .catch(() => setOrders([]));
  }, [token]);

  const addAddress = async () => {
    try {
      const data = await api.post('/auth/address', address, token);
      setMessage(data.message);
      setAddress({
        line1: '',
        line2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'India',
      });
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <section className="section-pad account-layout">
      <div className="account-panel">
        <h1 className="panel-title">Account</h1>
        <p>{user?.name}</p>
        <p>{user?.email}</p>
        <button type="button" onClick={signout}>
          Logout
        </button>

        <h2>Address Book</h2>
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
        <button type="button" onClick={addAddress}>
          Save Address
        </button>
        {message && <p className="form-message">{message}</p>}
      </div>

      <div className="order-panel">
        <h2 className="panel-title">Orders</h2>
        {!orders.length && <p>No orders found yet.</p>}
        {orders.map((order) => (
          <article key={order.id} className="order-card">
            <header>
              <strong>{order.id}</strong>
              <span>{order.status}</span>
            </header>
            <p>{new Date(order.createdAt).toLocaleString()}</p>
            <p>{formatPrice(order.total)}</p>
            <ul>
              {order.items.map((item) => (
                <li key={`${order.id}-${item.productId}-${item.size}`}>{`${item.name} x${item.quantity}`}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

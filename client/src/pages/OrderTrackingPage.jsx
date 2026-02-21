import { useState } from 'react';
import { PageHero } from '../components/PageHero';
import { api } from '../services/api';

export function OrderTrackingPage() {
  const [form, setForm] = useState({ orderId: '', email: '' });
  const [order, setOrder] = useState(null);
  const [message, setMessage] = useState('');

  const onSubmit = async (event) => {
    event.preventDefault();
    try {
      const data = await api.get(
        `/public/track-order?orderId=${encodeURIComponent(form.orderId)}&email=${encodeURIComponent(form.email)}`
      );
      setOrder(data.order);
      setMessage('');
    } catch (error) {
      setOrder(null);
      setMessage(error.message);
    }
  };

  return (
    <section>
      <PageHero title="Order Tracking" subtitle="Track your order status" />
      <div className="tracking-shell section-pad">
        <form onSubmit={onSubmit} className="tracking-form">
          <input
            type="text"
            placeholder="Order ID"
            value={form.orderId}
            onChange={(e) => setForm((prev) => ({ ...prev, orderId: e.target.value }))}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            required
          />
          <button type="submit" className="primary-btn">
            Track
          </button>
        </form>
        {message && <p className="form-message">{message}</p>}

        {order && (
          <article className="order-track-card">
            <h2>{order.id}</h2>
            <p>Status: {order.status}</p>
            <p>Total: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(order.total)}</p>
            <h3>Timeline</h3>
            <ul>
              {order.timeline.map((entry) => (
                <li key={`${entry.status}-${entry.at}`}>{`${entry.status} - ${new Date(entry.at).toLocaleString()}`}</li>
              ))}
            </ul>
          </article>
        )}
      </div>
    </section>
  );
}

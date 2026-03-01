import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

function formatPrice(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(value);
}

export function OrderConfirmationPage() {
  const { orderId } = useParams();
  const { token } = useAuth();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (token && orderId) {
      api.get('/checkout/my-orders', token).then((r) => {
        const found = r.orders.find((o) => o.id === orderId);
        if (found) setOrder(found);
      });
    }
  }, [token, orderId]);

  if (!order) {
    return <div className="page-status">Loading order details...</div>;
  }

  const addr = order.address || {};

  return (
    <section className="section-pad oc-page">
      <div className="oc-hero">
        <div className="oc-check">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="oc-title">Thank You for Your Order</h1>
        <p className="oc-subtitle">
          Order <strong>{order.orderNumber || order.id}</strong> has been placed successfully.
        </p>
        <p className="oc-note">A confirmation email has been sent to <strong>{order.customer?.email}</strong></p>
      </div>

      <div className="oc-content">
        <div className="oc-card">
          <h2 className="oc-card-heading">Order Details</h2>
          <div className="oc-detail-grid">
            <div>
              <span className="oc-label">Order Number</span>
              <span className="oc-value">{order.orderNumber || order.id}</span>
            </div>
            <div>
              <span className="oc-label">Date</span>
              <span className="oc-value">
                {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div>
              <span className="oc-label">Status</span>
              <span className="oc-value oc-status">{order.status}</span>
            </div>
            <div>
              <span className="oc-label">Total</span>
              <span className="oc-value">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        <div className="oc-card">
          <h2 className="oc-card-heading">Items</h2>
          <div className="oc-items">
            {order.items.map((item, i) => (
              <div key={i} className="oc-item-row">
                <div className="oc-item-thumb">
                  {item.image ? <img src={item.image} alt={item.name} /> : <div className="oc-item-placeholder" />}
                </div>
                <div className="oc-item-details">
                  <p className="oc-item-name">{item.name}</p>
                  <p className="oc-item-meta">Size: {item.size} &middot; Qty: {item.quantity}</p>
                </div>
                <span className="oc-item-price">{formatPrice(item.lineTotal)}</span>
              </div>
            ))}
          </div>
        </div>

        {addr.line1 && (
          <div className="oc-card">
            <h2 className="oc-card-heading">Shipping Address</h2>
            <p className="oc-addr">{addr.line1}</p>
            {addr.line2 && <p className="oc-addr">{addr.line2}</p>}
            <p className="oc-addr">{addr.city}, {addr.state} {addr.postalCode}</p>
            <p className="oc-addr">{addr.country}</p>
          </div>
        )}
      </div>

      <div className="oc-actions">
        <Link to="/account" className="oc-btn">View My Orders</Link>
        <Link to="/shop" className="oc-btn oc-btn--outline">Continue Shopping</Link>
      </div>
    </section>
  );
}

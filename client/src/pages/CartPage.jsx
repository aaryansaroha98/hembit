import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

function formatPrice(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function CartPage() {
  const { items, removeItem, updateQty, totals } = useCart();

  return (
    <section className="section-pad cart-layout">
      <div>
        <h1 className="panel-title">Cart</h1>
        {!items.length && <p>Your cart is empty.</p>}
        {items.map((item) => (
          <article key={`${item.productId}-${item.size}`} className="cart-item">
            <img src={item.image} alt={item.name} />
            <div>
              <h3>{item.name}</h3>
              <p>Size: {item.size}</p>
              <p>{formatPrice(item.price)}</p>
              <div className="qty-row">
                <button type="button" onClick={() => updateQty(item.productId, item.size, item.quantity - 1)}>
                  -
                </button>
                <span>{item.quantity}</span>
                <button type="button" onClick={() => updateQty(item.productId, item.size, item.quantity + 1)}>
                  +
                </button>
              </div>
              <button type="button" onClick={() => removeItem(item.productId, item.size)}>
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>

      <aside className="cart-summary">
        <h2>Order Summary</h2>
        <p>Subtotal: {formatPrice(totals.subtotal)}</p>
        <p>Shipping: {formatPrice(totals.shipping)}</p>
        <strong>Total: {formatPrice(totals.total)}</strong>
        <Link to="/checkout" className="primary-btn">
          CHECKOUT
        </Link>
      </aside>
    </section>
  );
}

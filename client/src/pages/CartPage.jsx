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
    <div className="content-page cart-page">
      <div className="content-page-inner">
        <h1>CART</h1>
      </div>

      <div className="cart-wrap">
        {!items.length ? (
          <div className="cart-empty">
            <p>Your cart is empty.</p>
            <Link to="/shop" className="cart-continue">CONTINUE SHOPPING</Link>
          </div>
        ) : (
          <div className="cart-grid">
            <div className="cart-items">
              {items.map((item) => (
                <div key={`${item.productId}-${item.size}`} className="cart-row">
                  <Link to={`/product/${item.productId}`} className="cart-row-img">
                    <img src={item.image} alt={item.name} />
                  </Link>
                  <div className="cart-row-info">
                    <div className="cart-row-top">
                      <h3>{item.name}</h3>
                      <button
                        type="button"
                        className="cart-remove"
                        onClick={() => removeItem(item.productId, item.size)}
                        aria-label="Remove"
                      >
                        &times;
                      </button>
                    </div>
                    <p className="cart-row-size">Size: {item.size}</p>
                    <p className="cart-row-price">{formatPrice(item.price)}</p>
                    <div className="cart-qty">
                      <button type="button" onClick={() => updateQty(item.productId, item.size, item.quantity - 1)}>−</button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => updateQty(item.productId, item.size, item.quantity + 1)}>+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <aside className="cart-aside">
              <h2>ORDER SUMMARY</h2>
              <div className="cart-aside-row">
                <span>Subtotal</span>
                <span>{formatPrice(totals.subtotal)}</span>
              </div>
              <div className="cart-aside-row">
                <span>Shipping</span>
                <span>{totals.shipping === 0 ? 'Free' : formatPrice(totals.shipping)}</span>
              </div>
              <div className="cart-aside-row cart-aside-total">
                <span>Total</span>
                <span>{formatPrice(totals.total)}</span>
              </div>
              <Link to="/checkout" className="cart-checkout-btn">CHECKOUT</Link>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

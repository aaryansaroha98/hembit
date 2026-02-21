import { Link } from 'react-router-dom';

function formatPrice(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function ProductCard({ product }) {
  return (
    <article className="product-card">
      <Link to={`/product/${product.slug}`} className="product-image-link">
        <img src={product.images?.[0]} alt={product.name} loading="lazy" />
      </Link>
      <div className="product-meta">
        <h3>{product.name}</h3>
        <p>{product.seriesName || ''}</p>
        <strong>{product.displayPrice || formatPrice(product.price)}</strong>
      </div>
    </article>
  );
}

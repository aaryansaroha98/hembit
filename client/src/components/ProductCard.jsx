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
      <div className="product-meta product-card-title">
        <div style={{textAlign: 'center', marginTop: '1.2rem'}}>
          <div style={{fontWeight: 600, fontSize: '1.02rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.2rem'}}>{product.name}</div>
          <div style={{fontWeight: 400, fontSize: '0.92rem', letterSpacing: '0.06em', color: '#888', textTransform: 'uppercase'}}>{product.seriesName || ''}</div>
        </div>
      </div>
    </article>
  );
}

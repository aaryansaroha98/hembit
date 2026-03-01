import { Link } from 'react-router-dom';

function formatPrice(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function ProductCard({ product }) {
  const linkSlug = product.slug || product.id;
  return (
    <article className="product-card">
      <Link
        to={`/product/${linkSlug}`}
        className="product-image-link"
      >
        <img src={product.images?.[0]} alt={product.name} loading="lazy" />
      </Link>
      <div className="product-meta product-card-title">
        <div style={{textAlign: 'center', marginTop: '0.6rem'}}>
          <div style={{fontWeight: 600, fontSize: '0.89rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.08rem'}}>{product.name}</div>
          <div style={{fontWeight: 400, fontSize: '0.75rem', letterSpacing: '0.06em', color: '#888', textTransform: 'uppercase'}}>{product.seriesName || ''}</div>
        </div>
      </div>
    </article>
  );
}

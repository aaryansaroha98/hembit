import { Link } from 'react-router-dom';

function formatPrice(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

const PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" fill="#f5f5f5"><rect width="400" height="500" fill="#f5f5f5"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#bbb" font-family="sans-serif" font-size="16">No Image</text></svg>'
);

export function ProductCard({ product }) {
  const linkSlug = product.slug || product.id;
  const imgSrc = product.images?.[0] || PLACEHOLDER;
  return (
    <article className="product-card">
      <Link
        to={`/product/${linkSlug}`}
        className="product-image-link"
      >
        <img
          src={imgSrc}
          alt={product.name}
          loading="lazy"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = PLACEHOLDER; }}
        />
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

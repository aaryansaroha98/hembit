import { useState } from 'react';
import { Link } from 'react-router-dom';

const PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" fill="#f5f5f3"><rect width="400" height="500" fill="#f5f5f3"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#bbb" font-family="sans-serif" font-size="16">No Image</text></svg>'
);

export function ProductCard({ product }) {
  const linkSlug = product.slug || product.id;
  const images = product.images?.length ? product.images : [PLACEHOLDER];
  const [idx, setIdx] = useState(0);
  const hasMultiple = images.length > 1;

  const prev = (e) => { e.preventDefault(); e.stopPropagation(); setIdx((i) => (i - 1 + images.length) % images.length); };
  const next = (e) => { e.preventDefault(); e.stopPropagation(); setIdx((i) => (i + 1) % images.length); };

  return (
    <article className="product-card">
      <Link to={`/product/${linkSlug}`} className="product-image-link">
        <img
          src={images[idx]}
          alt={product.name}
          loading="lazy"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = PLACEHOLDER; }}
        />
        {hasMultiple && (
          <>
            <button type="button" className="pc-arrow pc-arrow--l" onClick={prev} aria-label="Previous image">
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6"><polyline points="10,2 4,8 10,14" /></svg>
            </button>
            <button type="button" className="pc-arrow pc-arrow--r" onClick={next} aria-label="Next image">
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6"><polyline points="6,2 12,8 6,14" /></svg>
            </button>
            <div className="pc-indicator">
              <span className="pc-indicator-bar" style={{ width: `${((idx + 1) / images.length) * 100}%` }} />
            </div>
          </>
        )}
      </Link>
      <div className="product-meta">
        <span className="pc-name">{product.name}</span>
      </div>
    </article>
  );
}

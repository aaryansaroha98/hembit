import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useCart } from '../context/CartContext';

function formatPrice(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function ProductDetailsPage() {
  const { slug } = useParams();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState('M');
  const [message, setMessage] = useState('');
  const [currentImg, setCurrentImg] = useState(0);
  const galleryRef = useRef(null);

  useEffect(() => {
    api.get(`/public/product/${slug}`).then((response) => {
      setProduct(response.product);
      setSelectedSize(response.product.sizes?.[0] || 'M');
      setCurrentImg(0);
    });
  }, [slug]);

  /* Track which image is in view */
  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery || !product?.images?.length) return;

    /* Use gallery as root on mobile (horizontal scroll), viewport on desktop */
    const isMobile = window.innerWidth <= 900;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.dataset.idx);
            if (!isNaN(idx)) setCurrentImg(idx);
          }
        });
      },
      { root: isMobile ? gallery : null, threshold: 0.6 }
    );

    gallery.querySelectorAll('.pdp-img').forEach((img) => observer.observe(img));
    return () => observer.disconnect();
  }, [product]);

  if (!product) {
    return <div className="page-status">Loading product...</div>;
  }

  const totalImages = product.images?.length || 0;

  return (
    <section className="pdp">
      {/* Gallery */}
      <div className="pdp-gallery" ref={galleryRef}>
        {product.images?.map((image, i) => (
          <img key={image} src={image} alt={product.name} className="pdp-img" data-idx={i} />
        ))}
        {totalImages > 1 && (
          <div className="pdp-counter">
            <span>{currentImg + 1}</span>
            <span className="pdp-counter-line" />
            <span>{totalImages}</span>
          </div>
        )}
        {/* Mobile dots */}
        {totalImages > 1 && (
          <div className="pdp-dots">
            {product.images.map((_, i) => (
              <span key={i} className={`pdp-dot${i === currentImg ? ' pdp-dot--active' : ''}`} />
            ))}
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="pdp-info">
        <h1 className="pdp-name">{product.name}</h1>
        <p className="pdp-series">{product.seriesName}</p>

        <div className="pdp-size-row">
          <span className="pdp-size-label">SIZE</span>
          <select value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)}>
            {(product.sizes || []).map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>

        <p className="pdp-desc">{product.description}</p>

        <strong className="pdp-price">{product.displayPrice || formatPrice(product.price)}</strong>

        <button
          type="button"
          className="pdp-add-btn"
          onClick={() => {
            addItem(product, selectedSize, 1);
            setMessage('Added to cart');
            setTimeout(() => setMessage(''), 2500);
          }}
        >
          ADD TO CART
        </button>
        {message && <small className="pdp-msg">{message}</small>}

        <details className="pdp-accordion">
          <summary>More Details</summary>
          <div className="pdp-accordion-body">
            <p>{product.details}</p>
          </div>
        </details>

        {product.careInstructions && (
          <details className="pdp-accordion">
            <summary>Care Instructions</summary>
            <div className="pdp-accordion-body">
              <p>{product.careInstructions}</p>
            </div>
          </details>
        )}
      </div>
    </section>
  );
}

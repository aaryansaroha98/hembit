import { useEffect, useState } from 'react';
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

  useEffect(() => {
    api.get(`/public/product/${slug}`).then((response) => {
      setProduct(response.product);
      setSelectedSize(response.product.sizes?.[0] || 'M');
    });
  }, [slug]);

  if (!product) {
    return <div className="page-status">Loading product...</div>;
  }

  return (
    <section className="section-pad product-page">
      <div className="product-gallery">
        {product.images?.map((image) => (
          <img key={image} src={image} alt={product.name} />
        ))}
      </div>

      <div className="product-info">
        <p className="pdp-series">{product.seriesName}</p>
        <h1>{product.name}</h1>
        <strong>{product.displayPrice || formatPrice(product.price)}</strong>
        <p>{product.description}</p>

        <label htmlFor="size">Size</label>
        <select id="size" value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)}>
          {(product.sizes || []).map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="primary-btn"
          onClick={() => {
            addItem(product, selectedSize, 1);
            setMessage('Added to cart');
          }}
        >
          ADD TO CART
        </button>
        {message && <small>{message}</small>}

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

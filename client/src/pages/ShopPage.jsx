import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHero } from '../components/PageHero';
import { ProductCard } from '../components/ProductCard';
import { api } from '../services/api';

export function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({ products: [], categories: [] });
  const [loading, setLoading] = useState(true);

  const currentCategory = searchParams.get('category') || '';
  const currentSeries = searchParams.get('series') || '';
  const currentSearch = searchParams.get('search') || '';

  useEffect(() => {
    const query = new URLSearchParams();
    if (currentCategory) query.set('category', currentCategory);
    if (currentSeries) query.set('series', currentSeries);
    if (currentSearch) query.set('search', currentSearch);

    setLoading(true);
    api
      .get(`/public/shop?${query.toString()}`)
      .then((response) => setData(response))
      .finally(() => setLoading(false));
  }, [currentCategory, currentSeries, currentSearch]);

  const seriesOptions = useMemo(() => {
    const selectedCategory = data.categories.find((category) => category.slug === currentCategory);
    return selectedCategory?.series || [];
  }, [currentCategory, data.categories]);

  // Find the display name for the current category
  const selectedCategory = data.categories.find((category) => category.slug === currentCategory);
  const displayCategory = selectedCategory ? selectedCategory.name : "MEN";

  return (
    <div className="shop-page">
      <PageHero title={displayCategory} small />
      {loading ? (
        <div className="page-status">Loading products...</div>
      ) : (
        <section className="section-pad">
          <div className="product-grid">
            {data.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

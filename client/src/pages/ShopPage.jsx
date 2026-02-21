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

  return (
    <div className="shop-page">
      <PageHero title="Shop" subtitle="HEMBIT MEN" />

      <section className="shop-toolbar section-pad">
        <input
          type="search"
          value={currentSearch}
          placeholder="Search products"
          onChange={(e) => {
            const next = new URLSearchParams(searchParams);
            if (e.target.value) {
              next.set('search', e.target.value);
            } else {
              next.delete('search');
            }
            setSearchParams(next);
          }}
        />

        <select
          value={currentCategory}
          onChange={(e) => {
            const next = new URLSearchParams(searchParams);
            if (e.target.value) {
              next.set('category', e.target.value);
            } else {
              next.delete('category');
            }
            next.delete('series');
            setSearchParams(next);
          }}
        >
          <option value="">All Categories</option>
          {data.categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>

        <select
          value={currentSeries}
          onChange={(e) => {
            const next = new URLSearchParams(searchParams);
            if (e.target.value) {
              next.set('series', e.target.value);
            } else {
              next.delete('series');
            }
            setSearchParams(next);
          }}
        >
          <option value="">All Series</option>
          {seriesOptions.map((series) => (
            <option key={series.id} value={series.slug}>
              {series.name}
            </option>
          ))}
        </select>
      </section>

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

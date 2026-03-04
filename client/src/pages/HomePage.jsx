import { useEffect, useState } from 'react';
import { HeroSlider } from '../components/HeroSlider';
import { Footer } from '../components/Footer';
import { api } from '../services/api';

export function HomePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({ slides: [], featuredProducts: [] });

  useEffect(() => {
    api
      .get('/public/home')
      .then((response) => setData(response))
      .catch((err) => setError(err.message || 'Unable to load homepage'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="page-status">Loading homepage...</div>;
  }
  if (error) {
    return <div className="page-status">Homepage failed to load: {error}</div>;
  }
  if (!Array.isArray(data.slides) || data.slides.length === 0) {
    return <div className="page-status">No homepage slides available.</div>;
  }

  return (
    <div className="home-page">
      <HeroSlider slides={data.slides}>
        <Footer />
      </HeroSlider>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { HeroSlider } from '../components/HeroSlider';
import { Footer } from '../components/Footer';
import { api } from '../services/api';

export function HomePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ slides: [], featuredProducts: [] });

  useEffect(() => {
    api
      .get('/public/home')
      .then((response) => setData(response))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="page-status">Loading homepage...</div>;
  }

  return (
    <div className="home-page">
      <HeroSlider slides={data.slides}>
        <Footer />
      </HeroSlider>
    </div>
  );
}

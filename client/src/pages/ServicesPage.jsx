import { useEffect, useState } from 'react';
import { PageHero } from '../components/PageHero';
import { api } from '../services/api';

export function ServicesPage() {
  const [content, setContent] = useState(null);

  useEffect(() => {
    api.get('/public/content/services').then((response) => setContent(response.content));
  }, []);

  return (
    <section>
      <PageHero title="Services" subtitle="HEMBIT Client Care" />
      <div className="text-page">
        <h2>{content?.title || 'Services'}</h2>
        <p>{content?.body || ''}</p>
        <p>Email: support@hembit.in</p>
        <p>Call Us: +91 00000 00000</p>
        <p>Future Careers: careers@hembit.in</p>
      </div>
    </section>
  );
}

import { useEffect, useState } from 'react';
import { PageHero } from '../components/PageHero';
import { api } from '../services/api';

function ContentPage({ endpoint, heroTitle, subtitle }) {
  const [content, setContent] = useState(null);

  useEffect(() => {
    api.get(`/public/content/${endpoint}`).then((response) => setContent(response.content));
  }, [endpoint]);

  return (
    <section>
      <PageHero title={heroTitle} subtitle={subtitle} />
      <div className="text-page">
        <h2>{content?.title || heroTitle}</h2>
        <p>{content?.body || ''}</p>
      </div>
    </section>
  );
}

export function OurStoryPage() {
  return <ContentPage endpoint="about" heroTitle="Our Story" subtitle="HEMBIT" />;
}

export function FounderStoryPage() {
  return <ContentPage endpoint="founder" heroTitle="Founder Story" subtitle="HEMBIT" />;
}

export function PrivacyPolicyPage() {
  return <ContentPage endpoint="privacy" heroTitle="Privacy Policy" subtitle="HEMBIT" />;
}

export function TermsPage() {
  return <ContentPage endpoint="terms" heroTitle="Terms of Use" subtitle="HEMBIT" />;
}

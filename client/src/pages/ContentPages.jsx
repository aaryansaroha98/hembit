import { useEffect, useState } from 'react';
import { api } from '../services/api';

function ContentPage({ endpoint, heroTitle }) {
  const [content, setContent] = useState(null);

  useEffect(() => {
    api.get(`/public/content/${endpoint}`).then((response) => setContent(response.content));
  }, [endpoint]);

  return (
    <section className="content-page">
      <div className="content-page-inner">
        <h1>{(content?.title || heroTitle).toUpperCase()}</h1>
        <div className="content-page-body">
          {(content?.body || '').split('\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </div>
    </section>
  );
}

export function OurStoryPage() {
  return <ContentPage endpoint="about" heroTitle="Our Story" />;
}

export function FounderStoryPage() {
  return <ContentPage endpoint="founder" heroTitle="Founder Story" />;
}

export function PrivacyPolicyPage() {
  return <ContentPage endpoint="privacy" heroTitle="Privacy Policy" />;
}

export function TermsPage() {
  return <ContentPage endpoint="terms" heroTitle="Terms of Use" />;
}

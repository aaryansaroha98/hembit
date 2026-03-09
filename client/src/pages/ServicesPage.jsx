import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export function ServicesPage() {
  const [content, setContent] = useState(null);
  const [settings, setSettings] = useState({
    serviceContact: {
      supportEmail: 'support@hembit.in',
      contactNumber: '+91 00000 00000',
      contactHours: 'Mon-Sat 9AM-7PM IST',
    },
  });

  useEffect(() => {
    Promise.all([api.get('/public/content/services'), api.get('/public/settings')])
      .then(([contentResponse, settingsResponse]) => {
        setContent(contentResponse.content);
        if (settingsResponse?.settings) {
          setSettings(settingsResponse.settings);
        }
      })
      .catch(() => {});
  }, []);

  const contact = settings.serviceContact || {};
  const supportEmail = contact.supportEmail || 'support@hembit.in';
  const contactNumber = contact.contactNumber || '+91 00000 00000';
  const contactHours = contact.contactHours || 'Mon-Sat 9AM-7PM IST';
  const phoneHref = `tel:${contactNumber.replace(/\s+/g, '')}`;

  const blocks = [
    {
      key: 'email',
      title: 'Email',
      body: ['We strive to reply within 48 business hours.', supportEmail],
      ctaLabel: 'Email Us',
      ctaHref: `mailto:${supportEmail}`,
      external: true,
    },
    {
      key: 'contact',
      title: 'Contact Us',
      body: [contactNumber, contactHours],
      ctaLabel: 'Contact Us',
      ctaHref: phoneHref,
      external: true,
    },
    {
      key: 'track-order',
      title: 'Order Tracking',
      body: ['Track your HEMBIT order status in real time from dispatch to delivery.'],
      ctaLabel: 'More Details',
      ctaHref: '/order-tracking',
      external: false,
    },
  ];

  return (
    <section className="services-client-page">
      <div className="services-client-inner">
        <h1>{(content?.title || 'Client Service').toUpperCase()}</h1>

        <div className="services-client-grid">
          {blocks.map((block) => (
            <article
              className={`services-client-card${block.key === 'track-order' ? ' services-client-card-track' : ''}`}
              key={block.key}
            >
              <h2>{block.title.toUpperCase()}</h2>
              <div className="services-client-copy">
                {block.body.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              {block.external ? (
                <a href={block.ctaHref} className="services-client-btn">
                  {block.ctaLabel.toUpperCase()}
                </a>
              ) : (
                <Link to={block.ctaHref} className="services-client-btn">
                  {block.ctaLabel.toUpperCase()}
                </Link>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

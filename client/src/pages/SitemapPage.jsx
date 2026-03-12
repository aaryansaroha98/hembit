import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './SitemapPage.css';

export function SitemapPage() {
  useEffect(() => {
    document.title = 'Sitemap | HEMBIT';
  }, []);

  const sitemapData = [
    {
      title: 'EXPLORE',
      links: [
        { name: 'Home', path: '/' },
        { name: 'Shop / Services', path: '/shop' },
        { name: 'Concierge Services', path: '/services' },
      ],
    },
    {
      title: 'ABOUT US',
      links: [
        { name: 'Our Story', path: '/our-story' },
        { name: 'Founder Story', path: '/founder-story' },
        { name: 'Contact Us', path: '/services' },
      ],
    },
    {
      title: 'HB PRODUCTIONS',
      links: [
        { name: 'The Studio', path: '/hb-productions' },
        { name: 'New Series & Films', path: '/hb-productions' },
        { name: 'Behind the Scenes', path: '/hb-productions' },
      ],
    },
    {
      title: 'CUSTOMER CARE',
      links: [
        { name: 'Order Tracking', path: '/order-tracking' },
        { name: 'Privacy Notice', path: '/privacy-policy' },
        { name: 'Terms of Use', path: '/terms-of-use' },
      ],
    },
    {
      title: 'MY ACCOUNT',
      links: [
        { name: 'Sign In', path: '/signin' },
        { name: 'Create Account', path: '/signup' },
        { name: 'Dashboard', path: '/account' },
        { name: 'Shopping Cart', path: '/cart' },
      ],
    },
  ];

  return (
    <div className="sitemap-page">
      <div className="sitemap-header">
        <h1 className="sitemap-title">SITE DIRECTORY</h1>
        <div className="sitemap-divider"></div>
        <p className="sitemap-subtitle">Navigate the world of HEMBIT</p>
      </div>

      <div className="sitemap-grid">
        {sitemapData.map((category, index) => (
          <div key={index} className="sitemap-category">
            <h2 className="sitemap-category-title">{category.title}</h2>
            <ul className="sitemap-list">
              {category.links.map((link, lIndex) => (
                <li key={lIndex} className="sitemap-item">
                  <Link to={link.path} className="sitemap-link">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

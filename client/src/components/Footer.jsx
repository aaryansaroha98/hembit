import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../services/api';

export function Footer() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const subscribe = async (event) => {
    event.preventDefault();
    try {
      await api.post('/public/newsletter/subscribe', { email });
      setMessage('Subscribed successfully');
      setEmail('');
    } catch (error) {
      setMessage(error.message);
    }
  };

  /* ─── Home footer (unchanged full-page slide) ─── */
  if (isHome) {
    return (
      <footer className="site-footer site-footer--home">
        <div className="footer-inner">
          <div className="footer-main-grid">
            <div className="footer-col footer-version-col">
              <p className="footer-version">INDIA VERSION - ENGLISH</p>
            </div>

            <nav className="footer-links footer-col footer-links-main">
              <Link to="/our-story">ABOUT US</Link>
              <Link to="/founder-story">FOUNDER STORY</Link>
              <Link to="/services">SERVICES</Link>
            </nav>

            <nav className="footer-links footer-col footer-links-legal">
              <Link to="/privacy-policy">PRIVACY NOTICE</Link>
              <Link to="/terms-of-use">TERMS OF USE</Link>
            </nav>

            <form className="newsletter-form" onSubmit={subscribe}>
              <label htmlFor="newsletter-home">NEWSLETTER</label>
              <div>
                <input
                  id="newsletter-home"
                  type="email"
                  placeholder="Enter your email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button type="submit">JOIN</button>
              </div>
              {message && <small>{message}</small>}
            </form>
          </div>

          <div className="footer-bottom-row">
            <div className="footer-socials">
              <a href="https://www.instagram.com/hembit.in?igsh=MXNkajJ4cHp2b3FxMQ==" target="_blank" rel="noreferrer">Instagram</a>
              <a href="https://www.linkedin.com/company/hembit/" target="_blank" rel="noreferrer">LinkedIn</a>
              <a href="https://youtube.com/@hembit.support?si=YpujeB-XSrYQ7fX1" target="_blank" rel="noreferrer">YouTube</a>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  /* ─── Classic footer for all other pages ─── */
  return (
    <footer className="site-footer site-footer--compact">
      <div className="cf-inner">
        {/* Main columns */}
        <div className="cf-grid">
          <div className="cf-col">
            <p className="cf-version">INDIA VERSION - ENGLISH&ensp;&#8250;</p>
          </div>

          <div className="cf-col">
            <nav className="cf-links">
              <Link to="/services">CLIENT SERVICE</Link>
              <Link to="/our-story">ABOUT US</Link>
              <Link to="/order-tracking">TRACK ORDER</Link>
              <Link to="/account">MY ACCOUNT</Link>
            </nav>
          </div>

          <div className="cf-col">
            <nav className="cf-links">
              <Link to="/privacy-policy">PRIVACY NOTICE</Link>
              <Link to="/terms-of-use">TERMS OF USE</Link>
              <Link to="/founder-story">FOUNDER STORY</Link>
            </nav>
          </div>

          <div className="cf-col cf-col--end">
            <Link to="/hb-productions" className="cf-arrow-link">HB PRODUCTIONS&ensp;&#8250;</Link>
            <button type="button" className="cf-arrow-link" onClick={() => {
              const el = document.getElementById('cf-newsletter-popup');
              if (el) el.classList.toggle('cf-newsletter--open');
            }}>NEWSLETTER&ensp;&#8250;</button>
          </div>
        </div>

        {/* Inline newsletter (toggled) */}
        <div id="cf-newsletter-popup" className="cf-newsletter">
          <form className="cf-newsletter-form" onSubmit={subscribe}>
            <input
              type="email"
              placeholder="Enter your email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit">JOIN</button>
          </form>
          {message && <small className="cf-newsletter-msg">{message}</small>}
        </div>

        {/* Social icons */}
        <div className="cf-socials">
          <a href="https://www.instagram.com/hembit.in?igsh=MXNkajJ4cHp2b3FxMQ==" target="_blank" rel="noreferrer" aria-label="Instagram">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
          </a>
          <a href="https://www.linkedin.com/company/hembit/" target="_blank" rel="noreferrer" aria-label="LinkedIn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S.02 4.88.02 3.5 1.13 1 2.5 1s2.48 1.12 2.48 2.5zM.34 8.65h4.3V24H.34V8.65zM8.65 8.65h4.12v2.1h.06c.57-1.08 1.97-2.22 4.06-2.22 4.34 0 5.14 2.86 5.14 6.58V24h-4.3v-7.9c0-1.88-.03-4.3-2.62-4.3-2.62 0-3.02 2.05-3.02 4.17V24H8.65V8.65z"/></svg>
          </a>
          <a href="https://youtube.com/@hembit.support?si=YpujeB-XSrYQ7fX1" target="_blank" rel="noreferrer" aria-label="YouTube">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z"/></svg>
          </a>
        </div>
      </div>
    </footer>
  );
}

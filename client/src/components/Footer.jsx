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

  return (
    <footer className={`site-footer ${isHome ? 'site-footer--home' : 'site-footer--compact'}`}>
      <div className="footer-inner">
        <div className="footer-main-grid">
          {isHome && (
            <div className="footer-col footer-version-col">
              <p className="footer-version">INDIA VERSION - ENGLISH</p>
            </div>
          )}

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
            <label htmlFor="newsletter">NEWSLETTER</label>
            <div>
              <input
                id="newsletter"
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
          {!isHome && <p className="footer-version">INDIA VERSION - ENGLISH</p>}
          <div className="footer-socials">
            <a href="https://www.instagram.com/hembit.in?igsh=MXNkajJ4cHp2b3FxMQ==" target="_blank" rel="noreferrer">
              Instagram
            </a>
            <a href="https://www.linkedin.com/company/hembit/" target="_blank" rel="noreferrer">
              LinkedIn
            </a>
            <a href="https://youtube.com/@hembit.support?si=YpujeB-XSrYQ7fX1" target="_blank" rel="noreferrer">
              YouTube
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

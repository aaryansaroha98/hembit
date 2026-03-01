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

  /* ─── Professional footer for all other pages ─── */
  return (
    <footer className="site-footer site-footer--compact">
      <div className="cf-inner">
        {/* Newsletter banner */}
        <div className="cf-newsletter-band">
          <div className="cf-newsletter-text">
            <span className="cf-newsletter-heading">Stay in the loop</span>
            <span className="cf-newsletter-sub">Subscribe for exclusive drops, style updates & more.</span>
          </div>
          <form className="cf-newsletter-form" onSubmit={subscribe}>
            <input
              type="email"
              placeholder="Your email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit">SUBSCRIBE</button>
            {message && <small className="cf-newsletter-msg">{message}</small>}
          </form>
        </div>

        {/* Main columns */}
        <div className="cf-grid">
          <div className="cf-col">
            <h4 className="cf-heading">Company</h4>
            <nav className="cf-links">
              <Link to="/our-story">About Us</Link>
              <Link to="/founder-story">Founder Story</Link>
              <Link to="/hb-productions">HB Productions</Link>
            </nav>
          </div>

          <div className="cf-col">
            <h4 className="cf-heading">Customer Care</h4>
            <nav className="cf-links">
              <Link to="/services">Services</Link>
              <Link to="/order-tracking">Track Order</Link>
              <Link to="/account">My Account</Link>
            </nav>
          </div>

          <div className="cf-col">
            <h4 className="cf-heading">Legal</h4>
            <nav className="cf-links">
              <Link to="/privacy-policy">Privacy Policy</Link>
              <Link to="/terms-of-use">Terms of Use</Link>
            </nav>
          </div>

          <div className="cf-col">
            <h4 className="cf-heading">Connect</h4>
            <nav className="cf-links">
              <a href="https://www.instagram.com/hembit.in?igsh=MXNkajJ4cHp2b3FxMQ==" target="_blank" rel="noreferrer">Instagram</a>
              <a href="https://www.linkedin.com/company/hembit/" target="_blank" rel="noreferrer">LinkedIn</a>
              <a href="https://youtube.com/@hembit.support?si=YpujeB-XSrYQ7fX1" target="_blank" rel="noreferrer">YouTube</a>
            </nav>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="cf-bottom">
          <p className="cf-copyright">&copy; {new Date().getFullYear()} Hembit. All rights reserved.</p>
          <p className="cf-region">India &middot; English</p>
        </div>
      </div>
    </footer>
  );
}

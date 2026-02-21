import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export function Footer() {
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
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-main-grid">
          <div className="footer-link-columns">
            <nav className="footer-links">
              <Link to="/our-story">ABOUT US</Link>
              <Link to="/founder-story">FOUNDER STORY</Link>
              <Link to="/services">SERVICES</Link>
              <a href="mailto:support@hembit.in">EMAIL US</a>
              <Link to="/privacy-policy">PRIVACY NOTICE</Link>
            </nav>

            <nav className="footer-links footer-links-secondary">
              <Link to="/terms-of-use">TERMS OF USE</Link>
              <Link to="/order-tracking">ORDER TRACKING</Link>
              <Link to="/shop">SHOP</Link>
            </nav>
          </div>

          <form className="newsletter-form" onSubmit={subscribe}>
            <label htmlFor="newsletter">NEWSLETTER</label>
            <div>
              <input
                id="newsletter"
                type="email"
                placeholder="Enter email"
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
          <p className="footer-version">INDIA VERSION - ENGLISH</p>
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

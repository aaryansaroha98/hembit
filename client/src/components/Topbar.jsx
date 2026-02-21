import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="16.65" y1="16.65" x2="22" y2="22" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function Topbar() {
  const [menuData, setMenuData] = useState({ highlights: [], men: [] });
  const [openMenu, setOpenMenu] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const { items } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/public/navigation').then(setMenuData).catch(() => {});
  }, []);

  useEffect(() => {
    setOpenMenu('');
    setMobileOpen(false);
  }, [location.pathname]);

  const actionLabel = isAuthenticated ? 'ACCOUNT' : 'LOGIN';
  const isHome = location.pathname === '/';
  const useOverlayHeader = isHome && !openMenu && !mobileOpen;

  const renderMenu = () => {
    if (!openMenu) {
      return null;
    }

    const groups = openMenu === 'HB PRODUCTIONS' ? [] : openMenu === 'MEN' ? menuData.men : menuData.highlights;

    if (openMenu === 'HB PRODUCTIONS') {
      return (
        <div className="mega-menu" onMouseLeave={() => setOpenMenu('')}>
          <div className="mega-column">
            <h4>HB PRODUCTIONS</h4>
            <button type="button" onClick={() => navigate('/hb-productions')}>
              View All Stories
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="mega-menu" onMouseLeave={() => setOpenMenu('')}>
        {groups.map((category) => (
          <div className="mega-column" key={category.id}>
            <h4>{category.name.toUpperCase()}</h4>
            {category.series.map((series) => (
              <button
                key={series.id}
                type="button"
                onClick={() => {
                  navigate(`/shop?category=${category.slug}&series=${series.slug}`);
                  setOpenMenu('');
                }}
              >
                {series.name}
              </button>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <header
      className={`topbar-wrap${isHome ? ' topbar-wrap-home' : ''}${useOverlayHeader ? ' topbar-wrap-overlay' : ''}${mobileOpen ? ' topbar-wrap-mobile-open' : ''}`}
      onMouseLeave={() => setOpenMenu('')}
    >
      <div className="topbar">
        <button
          className="menu-toggle"
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          <span className={`menu-toggle-icon${mobileOpen ? ' is-open' : ''}`} aria-hidden="true" />
        </button>

        <nav className="topbar-left">
          {['HIGHLIGHTS', 'MEN', 'HB PRODUCTIONS'].map((item) => (
            <button
              key={item}
              type="button"
              className="nav-trigger"
              onMouseEnter={() => setOpenMenu(item)}
              onClick={() => setOpenMenu(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        <Link to="/" className="brand-mark">
          HEMBIT
        </Link>

        <button type="button" className="mobile-search" onClick={() => navigate('/shop')} aria-label="Open search">
          <SearchIcon />
        </button>

        <nav className="topbar-right">
          <Link to="/cart">CART ({items.length})</Link>
          <Link to="/services">SERVICES</Link>
          <Link to={isAuthenticated ? '/account' : '/signin'}>{actionLabel}</Link>
          <button type="button" className="search-btn" onClick={() => navigate('/shop')}>
            <SearchIcon />
          </button>
        </nav>
      </div>

      {openMenu && <button type="button" className="menu-backdrop" onClick={() => setOpenMenu('')} aria-label="Close menu" />}
      {mobileOpen && (
        <button
          type="button"
          className="menu-backdrop mobile-menu-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Close mobile menu"
        />
      )}
      {renderMenu()}

      {mobileOpen && (
        <div className="mobile-panel">
          <Link to="/shop" onClick={() => setMobileOpen(false)}>
            SHOP
          </Link>
          <Link to="/hb-productions" onClick={() => setMobileOpen(false)}>
            HB PRODUCTIONS
          </Link>
          <Link to="/services" onClick={() => setMobileOpen(false)}>
            SERVICES
          </Link>
          <Link to="/cart" onClick={() => setMobileOpen(false)}>
            CART
          </Link>
          <Link to={isAuthenticated ? '/account' : '/signin'} onClick={() => setMobileOpen(false)}>
            {actionLabel}
          </Link>
          <Link to="/order-tracking" onClick={() => setMobileOpen(false)}>
            ORDER TRACKING
          </Link>
        </div>
      )}
    </header>
  );
}

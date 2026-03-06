import { useEffect, useRef, useState } from 'react';
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

function ChevronDown({ open }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={`mob-chevron${open ? ' mob-chevron--open' : ''}`}
    >
      <polyline points="3,6 8,11 13,6" />
    </svg>
  );
}

export function Topbar() {
  const [menuData, setMenuData] = useState({ highlights: [], men: [] });
  const [hbStories, setHbStories] = useState([]);
  const [openMenu, setOpenMenu] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hideOnScroll, setHideOnScroll] = useState(false);
  /* Mobile sub-navigation: which top-level section is drilled into */
  const [mobSection, setMobSection] = useState(null); // 'HIGHLIGHTS' | 'MEN' | 'HB PRODUCTIONS' | null
  /* Which category accordion is expanded inside a section */
  const [mobExpanded, setMobExpanded] = useState(null);
  /* Search overlay */
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);
  const lastScrollYRef = useRef(0);
  const { isAuthenticated } = useAuth();
  const { items } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/public/navigation').then(setMenuData).catch(() => {});
    api
      .get('/public/hb-productions')
      .then((response) => setHbStories(Array.isArray(response?.posts) ? response.posts : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setOpenMenu('');
    closeMobile();
    closeSearch();
  }, [location.pathname]);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY || 0;
    setHideOnScroll(false);
  }, [location.pathname]);

  useEffect(() => {
    const lockVisible = mobileOpen || !!openMenu || searchOpen;
    if (lockVisible) {
      lastScrollYRef.current = window.scrollY || 0;
      setHideOnScroll(false);
      return undefined;
    }

    let ticking = false;
    const minDelta = 6;
    const hideAfterY = 120;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        const currentY = Math.max(window.scrollY || 0, 0);
        const delta = currentY - lastScrollYRef.current;

        if (currentY <= 8) {
          setHideOnScroll(false);
        } else if (Math.abs(delta) >= minDelta) {
          if (delta > 0 && currentY > hideAfterY) {
            setHideOnScroll(true);
          } else if (delta < 0) {
            setHideOnScroll(false);
          }
        }

        lastScrollYRef.current = currentY;
        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [mobileOpen, openMenu, searchOpen]);

  const closeMobile = () => {
    setMobileOpen(false);
    setMobSection(null);
    setMobExpanded(null);
  };

  const openSearchOverlay = () => {
    setSearchOpen(true);
    setSearchQuery('');
    closeMobile();
    setOpenMenu('');
    setTimeout(() => searchInputRef.current?.focus(), 80);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/shop?search=${encodeURIComponent(q)}`);
      closeSearch();
    }
  };

  const actionLabel = isAuthenticated ? 'ACCOUNT' : 'LOGIN';
  const isHome = location.pathname === '/';
  const useOverlayHeader = isHome && !openMenu && !mobileOpen;

  /* Desktop mega-menu */
  const renderMenu = () => {
    if (!openMenu) return null;

    const groups =
      openMenu === 'HB PRODUCTIONS' ? [] : openMenu === 'MEN' ? menuData.men : menuData.highlights;

    if (openMenu === 'HB PRODUCTIONS') {
      return (
        <div className="mega-menu" onMouseLeave={() => setOpenMenu('')}>
          <div className="mega-column">
            <h4>HB PRODUCTIONS</h4>
            {hbStories.map((story) => (
              <button
                key={story.id}
                type="button"
                onClick={() => {
                  navigate(`/hb-productions/${encodeURIComponent(story.id)}`);
                  setOpenMenu('');
                }}
              >
                {story.title}
              </button>
            ))}
            <button
              className="mega-view-all"
              type="button"
              onClick={() => {
                navigate('/hb-productions');
                setOpenMenu('');
              }}
            >
              VIEW ALL
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
            {(category.series || []).map((series) => (
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
            <button
              type="button"
              className="mega-view-all"
              onClick={() => {
                navigate(`/shop?category=${category.slug}`);
                setOpenMenu('');
              }}
            >
              VIEW ALL
            </button>
          </div>
        ))}
      </div>
    );
  };

  /* Mobile sub-menu categories for a given section */
  const mobGroups = mobSection === 'MEN' ? menuData.men : mobSection === 'HIGHLIGHTS' ? menuData.highlights : [];
  const isHbMobileSection = mobSection === 'HB PRODUCTIONS';

  return (
    <header
      className={`topbar-wrap${isHome ? ' topbar-wrap-home' : ''}${useOverlayHeader ? ' topbar-wrap-overlay' : ''}${mobileOpen ? ' topbar-wrap-mobile-open' : ''}${openMenu ? ' dropdown-open' : ''}${hideOnScroll ? ' topbar-wrap-hidden' : ''}`}
      onMouseLeave={() => setOpenMenu('')}
    >
      <div className="topbar">
        <button
          className="menu-toggle"
          type="button"
          onClick={() => (mobileOpen ? closeMobile() : setMobileOpen(true))}
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

        <button type="button" className="mobile-search" onClick={openSearchOverlay} aria-label="Open search">
          <SearchIcon />
        </button>

        <nav className="topbar-right">
          <Link to="/cart">CART ({items.length})</Link>
          <Link to="/services">SERVICES</Link>
          <Link to={isAuthenticated ? '/account' : '/signin'}>{actionLabel}</Link>
          <button type="button" className="search-btn" onClick={openSearchOverlay}>
            <SearchIcon />
          </button>
        </nav>
      </div>

      {openMenu && (
        <button type="button" className="menu-backdrop" onClick={() => setOpenMenu('')} aria-label="Close menu" />
      )}
      {renderMenu()}

      {/* ─── Full-screen mobile overlay ─── */}
      <div className={`mob-overlay${mobileOpen ? ' mob-overlay--open' : ''}`}>
        {/* Top bar inside overlay: X and search */}
        <div className="mob-overlay-top">
          <button type="button" className="mob-close" onClick={closeMobile} aria-label="Close menu">
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
              <line x1="3" y1="3" x2="17" y2="17" />
              <line x1="17" y1="3" x2="3" y2="17" />
            </svg>
          </button>
          <button
            type="button"
            className="mob-search-btn"
            onClick={() => {
              closeMobile();
              openSearchOverlay();
            }}
            aria-label="Search"
          >
            <SearchIcon />
          </button>
        </div>

        {/* Sliding view container */}
        <div className="mob-views">
          {/* Main view */}
          <div className={`mob-view mob-view-main${mobSection ? ' mob-view--left' : ''}`}>
            <div className="mob-primary">
              <button type="button" onClick={() => setMobSection('HIGHLIGHTS')}>HIGHLIGHTS</button>
              <button type="button" onClick={() => setMobSection('MEN')}>MEN</button>
              <button type="button" onClick={() => setMobSection('HB PRODUCTIONS')}>HB PRODUCTIONS</button>
            </div>
            <div className="mob-secondary">
              <Link to="/services" onClick={closeMobile}>SERVICES</Link>
              <Link to={isAuthenticated ? '/account' : '/signin'} onClick={closeMobile}>{actionLabel}</Link>
              <Link to="/cart" onClick={closeMobile}>CART ({items.length})</Link>
              <Link to="/order-tracking" onClick={closeMobile}>ORDER TRACKING</Link>
            </div>
          </div>

          {/* Sub view (categories) */}
          <div className={`mob-view mob-view-sub${mobSection ? ' mob-view--active' : ''}`}>
            <button type="button" className="mob-back" onClick={() => { setMobSection(null); setMobExpanded(null); }}>
              <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8">
                <polyline points="10,2 4,8 10,14" />
              </svg>
              <span>{mobSection}</span>
            </button>

            {isHbMobileSection ? (
              <div className="mob-categories">
                <div className="mob-cat-items">
                  {hbStories.map((story) => (
                    <button
                      key={story.id}
                      type="button"
                      onClick={() => {
                        closeMobile();
                        navigate(`/hb-productions/${encodeURIComponent(story.id)}`);
                      }}
                    >
                      {String(story.title || 'Untitled Story').toUpperCase()}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="mob-view-all"
                    onClick={() => {
                      closeMobile();
                      navigate('/hb-productions');
                    }}
                  >
                    VIEW ALL
                  </button>
                </div>
              </div>
            ) : (
              <div className="mob-categories">
                {mobGroups.map((cat) => (
                  <div key={cat.id} className="mob-cat">
                    <button
                      type="button"
                      className={`mob-cat-toggle${mobExpanded === cat.id ? ' mob-cat-toggle--open' : ''}`}
                      onClick={() => setMobExpanded(mobExpanded === cat.id ? null : cat.id)}
                    >
                      <span>{cat.name.toUpperCase()}</span>
                      <ChevronDown open={mobExpanded === cat.id} />
                    </button>
                    {mobExpanded === cat.id && (
                      <div className="mob-cat-items">
                        {cat.series.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              closeMobile();
                              navigate(`/shop?category=${cat.slug}&series=${s.slug}`);
                            }}
                          >
                            {s.name.toUpperCase()}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="mob-view-all"
                          onClick={() => {
                            closeMobile();
                            navigate(`/shop?category=${cat.slug}`);
                          }}
                        >
                          VIEW ALL
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Search overlay ─── */}
      <div className={`search-overlay${searchOpen ? ' search-overlay--open' : ''}`}>
        <form className="search-overlay-inner" onSubmit={handleSearchSubmit}>
          <SearchIcon />
          <input
            ref={searchInputRef}
            type="text"
            className="search-overlay-input"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="button" className="search-overlay-close" onClick={closeSearch} aria-label="Close search">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="4" x2="16" y2="16" />
              <line x1="16" y1="4" x2="4" y2="16" />
            </svg>
          </button>
        </form>
      </div>
      {searchOpen && <button type="button" className="search-overlay-backdrop" onClick={closeSearch} aria-label="Close search" />}
    </header>
  );
}

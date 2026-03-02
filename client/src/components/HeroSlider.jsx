import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const TRANSITION_DURATION = 400;
const COOLDOWN = TRANSITION_DURATION + 60;
const WHEEL_THRESHOLD = 30;
const TOUCH_THRESHOLD = 40;
const HEX_COLOR_REGEX = /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

function toHoverRgba(hexColor) {
  if (!HEX_COLOR_REGEX.test(hexColor)) {
    return '';
  }

  const compact = hexColor.slice(1);
  const expanded = compact.length === 3
    ? compact.split('').map((char) => `${char}${char}`).join('')
    : compact;
  const int = Number.parseInt(expanded, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;

  return `rgba(${r}, ${g}, ${b}, 0.72)`;
}

export function HeroSlider({ slides, children }) {
  const orderedSlides = useMemo(() => [...slides].sort((a, b) => a.order - b.order), [slides]);
  const totalPanels = orderedSlides.length + (children ? 1 : 0);
  const [activeIndex, setActiveIndex] = useState(0);
  const animatingRef = useRef(false);
  const wheelAccRef = useRef(0);
  const wheelTimerRef = useRef(null);
  const touchStartRef = useRef({ y: 0, x: 0 });

  const hasOverlay = useCallback((slide) => {
    return !!(slide.title || slide.subtitle || slide.ctaLabel);
  }, []);

  const goTo = useCallback(
    (index) => {
      if (animatingRef.current) return;
      const clamped = Math.max(0, Math.min(index, totalPanels - 1));
      if (clamped === activeIndex) return;
      animatingRef.current = true;
      setActiveIndex(clamped);
      setTimeout(() => {
        animatingRef.current = false;
      }, COOLDOWN);
    },
    [activeIndex, totalPanels]
  );

  const step = useCallback(
    (direction) => {
      goTo(activeIndex + direction);
    },
    [activeIndex, goTo]
  );

  /* ── wheel / touch / keyboard ── */
  useEffect(() => {
    const shouldIgnore = (target) =>
      target?.closest?.('.mobile-panel, .mega-menu, input, textarea, select, [contenteditable="true"]');
    const menuOpen = () => !!document.querySelector('.mobile-panel, .mega-menu');

    const onWheel = (e) => {
      if (menuOpen() || shouldIgnore(e.target)) return;
      e.preventDefault();
      if (Math.abs(e.deltaY) < 4) return;

      wheelAccRef.current += e.deltaY;
      clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(() => {
        wheelAccRef.current = 0;
      }, 200);

      if (Math.abs(wheelAccRef.current) < WHEEL_THRESHOLD) return;
      const dir = wheelAccRef.current > 0 ? 1 : -1;
      wheelAccRef.current = 0;
      step(dir);
    };

    const onKeyDown = (e) => {
      if (menuOpen()) return;
      const tag = e.target?.tagName?.toLowerCase();
      if (['input', 'select', 'textarea'].includes(tag) || e.target?.isContentEditable) return;

      if (['ArrowDown', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault();
        step(1);
      } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        step(-1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        goTo(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        goTo(totalPanels - 1);
      }
    };

    const onTouchStart = (e) => {
      if (menuOpen() || shouldIgnore(e.target) || e.touches.length !== 1) return;
      touchStartRef.current = { y: e.touches[0].clientY, x: e.touches[0].clientX };
    };

    const onTouchMove = (e) => {
      if (menuOpen() || shouldIgnore(e.target)) return;
      const dy = touchStartRef.current.y - e.touches[0].clientY;
      const dx = touchStartRef.current.x - e.touches[0].clientX;
      if (Math.abs(dy) > Math.abs(dx)) e.preventDefault();
    };

    const onTouchEnd = (e) => {
      if (menuOpen() || shouldIgnore(e.target)) return;
      const dy = touchStartRef.current.y - e.changedTouches[0].clientY;
      const dx = touchStartRef.current.x - e.changedTouches[0].clientX;
      if (Math.abs(dy) < TOUCH_THRESHOLD || Math.abs(dy) < Math.abs(dx)) return;
      step(dy > 0 ? 1 : -1);
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      clearTimeout(wheelTimerRef.current);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [step, goTo, totalPanels]);

  if (!orderedSlides.length) return null;

  const panelClass = (index) => {
    if (index <= activeIndex) return 'hero-panel hero-panel--visible';
    return 'hero-panel hero-panel--below';
  };

  const isProductSlide = orderedSlides[activeIndex]?.type === 'products';
  const isLastPanel = activeIndex === orderedSlides.length && children;
  const sliderRef = useRef(null);
  const brightnessCache = useRef({});   // url → 'light' | 'dark'
  const [heroTheme, setHeroTheme] = useState('dark');

  // Analyse the average brightness of the top strip of an image / video frame
  const analyseBrightness = useCallback((mediaEl, url) => {
    if (brightnessCache.current[url]) {
      setHeroTheme(brightnessCache.current[url]);
      return;
    }
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      // Sample a small strip across the top (navbar region)
      const sampleW = 120;
      const sampleH = 20;
      canvas.width = sampleW;
      canvas.height = sampleH;
      ctx.drawImage(mediaEl, 0, 0, mediaEl.videoWidth || mediaEl.naturalWidth, (mediaEl.videoHeight || mediaEl.naturalHeight) * 0.12, 0, 0, sampleW, sampleH);
      const { data } = ctx.getImageData(0, 0, sampleW, sampleH);
      let total = 0;
      const pixels = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        // perceived luminance
        total += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      }
      const avg = total / pixels;       // 0-255
      const theme = avg > 140 ? 'light' : 'dark';
      brightnessCache.current[url] = theme;
      setHeroTheme(theme);
    } catch {
      // cross-origin or other error → fall back to dark
      setHeroTheme('dark');
    }
  }, []);

  // Detect brightness whenever active slide changes
  useEffect(() => {
    if (isProductSlide || isLastPanel) {
      setHeroTheme('light');
      return;
    }

    const slide = orderedSlides[activeIndex];
    if (!slide?.url) { setHeroTheme('dark'); return; }

    // If already cached, apply immediately
    if (brightnessCache.current[slide.url]) {
      setHeroTheme(brightnessCache.current[slide.url]);
      return;
    }

    // Find the actual media element inside the active panel
    const panel = sliderRef.current?.querySelectorAll('.hero-panel')?.[activeIndex];
    if (!panel) return;

    const img = panel.querySelector('.hero-media img');
    const video = panel.querySelector('.hero-media video');

    if (img) {
      if (img.complete && img.naturalWidth) {
        analyseBrightness(img, slide.url);
      } else {
        img.addEventListener('load', () => analyseBrightness(img, slide.url), { once: true });
      }
    } else if (video) {
      const tryFrame = () => {
        if (video.readyState >= 2) {
          analyseBrightness(video, slide.url);
        } else {
          video.addEventListener('loadeddata', () => analyseBrightness(video, slide.url), { once: true });
        }
      };
      tryFrame();
    }
  }, [activeIndex, isProductSlide, isLastPanel, orderedSlides, analyseBrightness]);

  // Sync theme attribute to body
  useEffect(() => {
    document.body.setAttribute('data-hero-theme', heroTheme);
    return () => document.body.removeAttribute('data-hero-theme');
  }, [heroTheme]);

  // Optional per-slide topbar link color from admin
  useEffect(() => {
    const activeSlide = orderedSlides[activeIndex];
    const rawColor = String(activeSlide?.topbarLinkColor || '').trim();
    const normalized = rawColor.startsWith('#') ? rawColor : `#${rawColor}`;

    if (HEX_COLOR_REGEX.test(normalized)) {
      document.body.style.setProperty('--hero-topbar-link-color', normalized);
      document.body.style.setProperty('--hero-topbar-link-hover-color', toHoverRgba(normalized));
    } else {
      document.body.style.removeProperty('--hero-topbar-link-color');
      document.body.style.removeProperty('--hero-topbar-link-hover-color');
    }

    return () => {
      document.body.style.removeProperty('--hero-topbar-link-color');
      document.body.style.removeProperty('--hero-topbar-link-hover-color');
    };
  }, [activeIndex, orderedSlides]);

  return (
    <section className="hero-slider" ref={sliderRef}>
      {/* Navigation dots */}
      <div className={`slider-dots${isProductSlide ? ' slider-dots--dark' : ''}`}>
        {Array.from({ length: totalPanels }).map((_, i) => (
          <button
            key={i}
            type="button"
            className={i === activeIndex ? 'active' : ''}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Image / video / product slides */}
      {orderedSlides.map((slide, i) => (
        <article className={panelClass(i)} key={slide.id} style={{ zIndex: i + 1 }}>
          {slide.type === 'products' ? (
            /* ─── Product Grid Panel ─── */
            <div className="hero-product-panel">
              {hasOverlay(slide) && (
                <div className={`hero-product-header${i === activeIndex ? ' hero-overlay--visible' : ''}`}>
                  {slide.subtitle && <p className="hero-overline">{slide.subtitle}</p>}
                  {slide.title && <h2>{slide.title}</h2>}
                </div>
              )}
              <div className={`hero-product-grid hero-product-grid--${slide.layout || 2}`}>
                {(slide.products || []).map((product) => {
                  const linkSlug = product.slug || product.id;
                  return (
                    <Link
                      to={`/product/${linkSlug}`}
                      className="hero-product-card"
                      key={product.id}
                    >
                      <div className="hero-product-img">
                        <img src={product.images?.[0]} alt={product.name} />
                      </div>
                      <div className="hero-product-info">
                        <span className="hero-product-name">{product.name}</span>
                        {product.seriesName && (
                          <span className="hero-product-series">{product.seriesName}</span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ─── Image / Video Panel ─── */
            <>
              <div className="hero-media">
                {slide.type === 'video' ? (
                  <video src={slide.url} autoPlay muted loop playsInline preload="metadata" />
                ) : (
                  <img src={slide.url} alt={slide.title || 'Slide'} />
                )}
              </div>
              {hasOverlay(slide) && <div className="hero-slide-mask" />}
              {hasOverlay(slide) && (
                <div className={`hero-overlay${i === activeIndex ? ' hero-overlay--visible' : ''}`}>
                  {slide.subtitle && <p className="hero-overline">{slide.subtitle}</p>}
                  {slide.title && <h1>{slide.title}</h1>}
                  {slide.ctaLabel && (
                    <Link to={slide.ctaLink || '/shop'}>{slide.ctaLabel}</Link>
                  )}
                </div>
              )}
            </>
          )}
        </article>
      ))}

      {/* Footer panel (last slide) */}
      {children && (
        <div className={panelClass(orderedSlides.length)} style={{ zIndex: orderedSlides.length + 1 }}>
          {children}
        </div>
      )}
    </section>
  );
}

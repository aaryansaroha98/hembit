import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const TRANSITION_DURATION = 900;
const COOLDOWN = TRANSITION_DURATION + 80;
const WHEEL_THRESHOLD = 30;
const TOUCH_THRESHOLD = 40;

export function HeroSlider({ slides, children }) {
  const orderedSlides = useMemo(() => [...slides].sort((a, b) => a.order - b.order), [slides]);
  const totalPanels = orderedSlides.length + (children ? 1 : 0);
  const [activeIndex, setActiveIndex] = useState(0);
  const animatingRef = useRef(false);
  const wheelAccRef = useRef(0);
  const wheelTimerRef = useRef(null);
  const touchStartRef = useRef({ y: 0, x: 0 });

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

  return (
    <section className="hero-slider">
      {/* Navigation dots */}
      <div className="slider-dots">
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

      {/* Image / video slides */}
      {orderedSlides.map((slide, i) => (
        <article className={panelClass(i)} key={slide.id} style={{ zIndex: i + 1 }}>
          <div className="hero-media">
            {slide.type === 'video' ? (
              <video src={slide.url} autoPlay muted loop playsInline preload="metadata" />
            ) : (
              <img src={slide.url} alt={slide.title} />
            )}
          </div>
          <div className="hero-slide-mask" />
          <div className={`hero-overlay${i === activeIndex ? ' hero-overlay--visible' : ''}`}>
            <p className="hero-overline">{slide.subtitle}</p>
            <h1>{slide.title}</h1>
            <Link to={slide.ctaLink || '/shop'}>{slide.ctaLabel || 'Discover'}</Link>
          </div>
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

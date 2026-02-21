import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export function HeroSlider({ slides }) {
  const orderedSlides = useMemo(() => [...slides].sort((a, b) => a.order - b.order), [slides]);
  const [index, setIndex] = useState(0);
  const sliderRef = useRef(null);
  const wheelLockRef = useRef(false);
  const touchStartYRef = useRef(0);
  const maxIndex = Math.max(orderedSlides.length - 1, 0);

  useEffect(() => {
    if (index > orderedSlides.length - 1) {
      setIndex(0);
    }
  }, [index, orderedSlides.length]);

  useEffect(() => {
    const node = sliderRef.current;
    if (!node || orderedSlides.length <= 1) {
      return;
    }

    const releaseLock = () => {
      wheelLockRef.current = false;
    };

    const onWheel = (event) => {
      if (wheelLockRef.current) {
        event.preventDefault();
        return;
      }

      const stepDown = event.deltaY > 12;
      const stepUp = event.deltaY < -12;

      if (stepDown && index < maxIndex) {
        event.preventDefault();
        wheelLockRef.current = true;
        setIndex((prev) => Math.min(prev + 1, maxIndex));
        window.setTimeout(releaseLock, 850);
        return;
      }

      if (stepUp && index > 0) {
        event.preventDefault();
        wheelLockRef.current = true;
        setIndex((prev) => Math.max(prev - 1, 0));
        window.setTimeout(releaseLock, 850);
      }
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [index, maxIndex, orderedSlides.length]);

  if (!orderedSlides.length) {
    return null;
  }

  return (
    <section
      className="hero-slider"
      ref={sliderRef}
      onTouchStart={(event) => {
        touchStartYRef.current = event.touches[0].clientY;
      }}
      onTouchEnd={(event) => {
        const touchEndY = event.changedTouches[0].clientY;
        const delta = touchStartYRef.current - touchEndY;

        if (Math.abs(delta) < 45) {
          return;
        }

        if (delta > 0 && index < maxIndex) {
          setIndex((prev) => Math.min(prev + 1, maxIndex));
          return;
        }

        if (delta < 0 && index > 0) {
          setIndex((prev) => Math.max(prev - 1, 0));
        }
      }}
    >
      <div className="hero-track">
        {orderedSlides.map((slide, slideIndex) => (
          <article
            className={`hero-slide${slideIndex === index ? ' is-active' : ''}`}
            key={slide.id}
            style={{
              transform:
                slideIndex === index
                  ? 'translate3d(0, 0, 0)'
                  : slideIndex < index
                    ? slideIndex === index - 1
                      ? 'translate3d(0, -12%, 0)'
                      : 'translate3d(0, -18%, 0)'
                    : 'translate3d(0, 100%, 0)',
              opacity: slideIndex < index - 1 ? 0 : 1,
              zIndex: slideIndex === index ? 30 : slideIndex > index ? 20 : 10,
              pointerEvents: slideIndex === index ? 'auto' : 'none',
            }}
          >
            {slide.type === 'video' ? (
              <video src={slide.url} autoPlay muted loop playsInline preload="metadata" />
            ) : (
              <img src={slide.url} alt={slide.title} />
            )}
            <div className="hero-slide-mask" />
            <div className="hero-overlay">
              <p className="hero-overline">{slide.subtitle}</p>
              <h1>{slide.title}</h1>
              <Link to={slide.ctaLink || '/shop'}>{slide.ctaLabel || 'Discover'}</Link>
            </div>
          </article>
        ))}
      </div>

      <div className="slider-dots">
        {orderedSlides.map((slide, dotIndex) => (
          <button
            key={slide.id}
            type="button"
            className={dotIndex === index ? 'active' : ''}
            onClick={() => setIndex(dotIndex)}
            aria-label={`Go to slide ${dotIndex + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

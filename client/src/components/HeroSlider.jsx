import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export function HeroSlider({ slides }) {
  const orderedSlides = useMemo(() => [...slides].sort((a, b) => a.order - b.order), [slides]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showDots, setShowDots] = useState(true);
  const sliderRef = useRef(null);
  const sectionRefs = useRef([]);

  useEffect(() => {
    sectionRefs.current = sectionRefs.current.slice(0, orderedSlides.length);
    setActiveIndex((prevIndex) => Math.min(prevIndex, Math.max(orderedSlides.length - 1, 0)));
  }, [orderedSlides.length]);

  useEffect(() => {
    if (!orderedSlides.length) {
      return;
    }

    const slideObserver = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (!visibleEntries.length) {
          return;
        }

        const topEntry = visibleEntries.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const idx = Number(topEntry.target.getAttribute('data-slide-index'));
        if (!Number.isNaN(idx)) {
          setActiveIndex(idx);
        }
      },
      {
        threshold: [0.45, 0.6, 0.75],
        rootMargin: '0px 0px -8% 0px',
      }
    );

    for (const section of sectionRefs.current) {
      if (section) {
        slideObserver.observe(section);
      }
    }

    return () => slideObserver.disconnect();
  }, [orderedSlides.length]);

  useEffect(() => {
    const node = sliderRef.current;
    if (!node) {
      return;
    }

    const sliderObserver = new IntersectionObserver(
      ([entry]) => {
        setShowDots(entry?.isIntersecting ?? false);
      },
      { threshold: 0.02 }
    );

    sliderObserver.observe(node);
    return () => sliderObserver.disconnect();
  }, []);

  if (!orderedSlides.length) {
    return null;
  }

  return (
    <section className="hero-slider" ref={sliderRef}>
      <div className={`slider-dots${showDots ? '' : ' hidden'}`}>
        {orderedSlides.map((slide, dotIndex) => (
          <button
            key={slide.id}
            type="button"
            className={dotIndex === activeIndex ? 'active' : ''}
            onClick={() =>
              sectionRefs.current[dotIndex]?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              })
            }
            aria-label={`Go to slide ${dotIndex + 1}`}
          />
        ))}
      </div>

      {orderedSlides.map((slide, slideIndex) => (
        <article
          className={`hero-page${slideIndex === activeIndex ? ' is-active' : ''}`}
          key={slide.id}
          data-slide-index={slideIndex}
          ref={(node) => {
            sectionRefs.current[slideIndex] = node;
          }}
        >
          <div className="hero-media">
            {slide.type === 'video' ? (
              <video src={slide.url} autoPlay muted loop playsInline preload="metadata" />
            ) : (
              <img src={slide.url} alt={slide.title} />
            )}
          </div>
          <div className="hero-slide-mask" />
          <div className="hero-overlay">
            <p className="hero-overline">{slide.subtitle}</p>
            <h1>{slide.title}</h1>
            <Link to={slide.ctaLink || '/shop'}>{slide.ctaLabel || 'Discover'}</Link>
          </div>
        </article>
      ))}
    </section>
  );
}

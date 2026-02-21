import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

export function HeroSlider({ slides }) {
  const orderedSlides = useMemo(() => [...slides].sort((a, b) => a.order - b.order), [slides]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!orderedSlides.length) {
      return;
    }

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % orderedSlides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [orderedSlides]);

  useEffect(() => {
    if (index > orderedSlides.length - 1) {
      setIndex(0);
    }
  }, [index, orderedSlides.length]);

  if (!orderedSlides.length) {
    return null;
  }

  const active = orderedSlides[index];

  return (
    <section className="hero-slider">
      <div className="hero-media-stage">
        {orderedSlides.map((slide, slideIndex) => (
          <div className={`media-wrap${slideIndex === index ? ' is-active' : ''}`} key={slide.id}>
            {slide.type === 'video' ? (
              <video src={slide.url} autoPlay={slideIndex === index} muted loop playsInline preload="metadata" />
            ) : (
              <img src={slide.url} alt={slide.title} />
            )}
          </div>
        ))}
      </div>

      <div className="hero-overlay" key={active.id}>
        <p className="hero-overline">{active.subtitle}</p>
        <h1>{active.title}</h1>
        <Link to={active.ctaLink || '/shop'}>{active.ctaLabel || 'Discover'}</Link>
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

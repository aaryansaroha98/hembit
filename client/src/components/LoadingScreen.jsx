import { useEffect, useRef, useState } from 'react';
import logoVideo from '../assets/logo-animation.mp4';

export function LoadingScreen({ onFinished }) {
  const [phase, setPhase] = useState('playing'); // playing → fading → done
  const videoRef = useRef(null);
  const readyToFade = useRef(false);

  /* Video plays once. When it ends, start fade. */
  /* Also set a safety fallback of 4s in case onEnded doesn't fire. */
  useEffect(() => {
    const fallback = setTimeout(() => {
      if (!readyToFade.current) {
        readyToFade.current = true;
        setPhase('fading');
      }
    }, 4000);
    return () => clearTimeout(fallback);
  }, []);

  const handleEnded = () => {
    if (readyToFade.current) return;
    readyToFade.current = true;
    setPhase('fading');
  };

  useEffect(() => {
    if (phase === 'fading') {
      const timer = setTimeout(() => {
        setPhase('done');
        onFinished?.();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [phase, onFinished]);

  if (phase === 'done') return null;

  return (
    <div className={`loading-screen${phase === 'fading' ? ' loading-screen--fade-out' : ''}`}>
      <div className="loading-screen-content">
        <video
          ref={videoRef}
          src={logoVideo}
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={handleEnded}
          className="loading-screen-video"
        />
      </div>
    </div>
  );
}

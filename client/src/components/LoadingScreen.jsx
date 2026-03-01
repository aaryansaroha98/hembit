import { useEffect, useRef, useState } from 'react';
import logoVideo from '../assets/logo-animation.mp4';

export function LoadingScreen({ onFinished }) {
  const [phase, setPhase] = useState('playing'); // playing → fading → done
  const videoRef = useRef(null);
  const readyToFade = useRef(false);

  const startFade = () => {
    if (readyToFade.current) return;
    readyToFade.current = true;
    setPhase('fading');
  };

  /* Try to force-play the video on mount (mobile needs this) */
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    /* Set attributes explicitly for mobile */
    vid.setAttribute('muted', '');
    vid.setAttribute('playsinline', '');
    vid.muted = true;

    const playPromise = vid.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(() => {
        /* Autoplay blocked — skip to fade after 1.5s */
        setTimeout(startFade, 1500);
      });
    }

    /* Safety fallback: if nothing fires in 4s, just fade out */
    const fallback = setTimeout(startFade, 4000);
    return () => clearTimeout(fallback);
  }, []);

  const handleEnded = () => startFade();

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

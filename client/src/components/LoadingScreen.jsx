import { useEffect, useRef, useState } from 'react';
import logoVideo from '../assets/logo-animation.mp4';

const MIN_DISPLAY_MS = 1800;

export function LoadingScreen({ onFinished }) {
  const [phase, setPhase] = useState('visible'); // visible → fading → done
  const startRef = useRef(Date.now());
  const videoRef = useRef(null);
  const minElapsed = useRef(false);
  const videoEnded = useRef(false);

  useEffect(() => {
    startRef.current = Date.now();
  }, []);

  const tryFade = () => {
    if (minElapsed.current && videoEnded.current) {
      setPhase('fading');
    }
  };

  /* Minimum display timer */
  useEffect(() => {
    const timer = setTimeout(() => {
      minElapsed.current = true;
      tryFade();
    }, MIN_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, []);

  /* When video finishes one loop */
  const handleVideoEnded = () => {
    videoEnded.current = true;
    tryFade();
  };

  useEffect(() => {
    if (phase === 'fading') {
      const timer = setTimeout(() => {
        setPhase('done');
        onFinished?.();
      }, 600);
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
          onEnded={handleVideoEnded}
          className="loading-screen-video"
        />
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import logoVideo from '../assets/logo-animation.mp4';

const MIN_DISPLAY_MS = 2000;

export function LoadingScreen({ onFinished }) {
  const [phase, setPhase] = useState('visible'); // visible → fading → done
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (phase !== 'visible') return;

    const elapsed = Date.now() - startRef.current;
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);

    const timer = setTimeout(() => {
      setPhase('fading');
    }, remaining);

    return () => clearTimeout(timer);
  }, [phase]);

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
          src={logoVideo}
          autoPlay
          muted
          playsInline
          loop
          className="loading-screen-video"
        />
      </div>
    </div>
  );
}

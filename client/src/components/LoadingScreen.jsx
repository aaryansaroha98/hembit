import { useEffect, useRef, useState } from 'react';

const MIN_DISPLAY_MS = 2000;

export function LoadingScreen({ videoUrl, onFinished }) {
  const [phase, setPhase] = useState('visible'); // visible → fading → done
  const startRef = useRef(Date.now());
  const videoRef = useRef(null);

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
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            autoPlay
            muted
            playsInline
            loop
            className="loading-screen-video"
          />
        ) : (
          <div className="loading-screen-logo">HEMBIT</div>
        )}
      </div>
    </div>
  );
}

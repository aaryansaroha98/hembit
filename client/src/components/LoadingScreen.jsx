import { useEffect, useRef, useState } from 'react';
import logoVideo from '../assets/logo-animation.mp4';

const MIN_DISPLAY_MS = 1000;

export function LoadingScreen({ onFinished }) {
  const [phase, setPhase] = useState('visible'); // visible → fading → done
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef(null);
  const minElapsed = useRef(false);
  const videoEnded = useRef(false);

  const tryFade = () => {
    if (minElapsed.current && videoEnded.current) {
      setPhase('fading');
    }
  };

  /* Minimum display timer — starts when video is ready */
  useEffect(() => {
    if (!videoReady) return;
    const timer = setTimeout(() => {
      minElapsed.current = true;
      tryFade();
    }, MIN_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [videoReady]);

  const handleCanPlay = () => {
    setVideoReady(true);
    videoRef.current?.play().catch(() => {});
  };

  const handleVideoEnded = () => {
    videoEnded.current = true;
    tryFade();
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
          muted
          playsInline
          preload="auto"
          onCanPlayThrough={handleCanPlay}
          onEnded={handleVideoEnded}
          className="loading-screen-video"
          style={{ opacity: videoReady ? 1 : 0, transition: 'opacity 0.15s ease' }}
        />
      </div>
    </div>
  );
}

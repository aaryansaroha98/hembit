import { useEffect, useRef, useState } from 'react';
import logoVideo from '../assets/logo-animation.mp4';

export function LoadingScreen({ onFinished, waitForBackend = false }) {
  const [phase, setPhase] = useState('playing'); // playing → fading → done
  const [isColdStart, setIsColdStart] = useState(false);
  const videoRef = useRef(null);
  const videoEnded = useRef(false);
  const backendReady = useRef(!waitForBackend); // skip check if not needed
  const fadeStarted = useRef(false);

  const tryFade = () => {
    if (fadeStarted.current) return;
    if (!videoEnded.current || !backendReady.current) return;
    fadeStarted.current = true;
    setPhase('fading');
  };

  /* Ping backend health until it responds */
  useEffect(() => {
    if (!waitForBackend) return;

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    let cancelled = false;

    let firstAttempt = true;
    const ping = async () => {
      while (!cancelled) {
        try {
          const res = await fetch(`${API_URL}/health`, { method: 'GET' });
          if (res.ok) {
            backendReady.current = true;
            tryFade();
            return;
          }
        } catch {
          /* server still waking up */
        }
        if (firstAttempt) {
          firstAttempt = false;
          if (!cancelled) setIsColdStart(true);
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    };

    ping();
    return () => { cancelled = true; };
  }, [waitForBackend]);

  /* Try to force-play the video on mount (mobile needs this) */
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    vid.setAttribute('muted', '');
    vid.setAttribute('playsinline', '');
    vid.muted = true;

    const playPromise = vid.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(() => {
        videoEnded.current = true;
        tryFade();
      });
    }

    /* Safety fallback */
    const fallback = setTimeout(() => {
      videoEnded.current = true;
      tryFade();
    }, 4000);
    return () => clearTimeout(fallback);
  }, []);

  const handleEnded = () => {
    videoEnded.current = true;
    /* If backend still loading, loop the video */
    if (!backendReady.current && videoRef.current) {
      videoRef.current.play().catch(() => {});
    } else {
      tryFade();
    }
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
        {isColdStart && (
          <div className="loading-screen-brand" aria-hidden="true">
            {'HEMBIT'.split('').map((char, i) => (
              <span key={i} className="loading-screen-letter" style={{ animationDelay: `${i * 0.18}s` }}>
                {char}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

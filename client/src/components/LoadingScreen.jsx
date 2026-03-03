import { useEffect, useRef, useState } from 'react';
import logoVideo from '../assets/logo-animation.mp4';

export function LoadingScreen({ onFinished, waitForBackend = false }) {
  const MIN_LOADING_MS = 1500;
  const BACKEND_RETRY_MS = 750;
  const [phase, setPhase] = useState('playing'); // playing → fading → done
  const [isColdStart, setIsColdStart] = useState(false);
  const videoRef = useRef(null);
  const minDelayPassed = useRef(false);
  const backendReady = useRef(!waitForBackend); // skip check if not needed
  const fadeStarted = useRef(false);

  const tryFade = () => {
    if (fadeStarted.current) return;
    if (!minDelayPassed.current || !backendReady.current) return;
    fadeStarted.current = true;
    setPhase('fading');
  };

  /* Enforce minimum loader time */
  useEffect(() => {
    const timer = setTimeout(() => {
      minDelayPassed.current = true;
      tryFade();
    }, MIN_LOADING_MS);
    return () => clearTimeout(timer);
  }, []);

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
        await new Promise((r) => setTimeout(r, BACKEND_RETRY_MS));
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
      playPromise.catch(() => {});
    }
  }, []);

  const handleEnded = () => {
    /* If minimum delay/backend still not ready, loop the video */
    if ((!backendReady.current || !minDelayPassed.current) && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
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

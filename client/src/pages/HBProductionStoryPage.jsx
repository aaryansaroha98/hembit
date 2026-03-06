import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

function resolveStoryImageSrc(rawUrl) {
  const value = String(rawUrl || '').trim();
  if (!value) return '';

  if (value.startsWith('/uploads/') || value.startsWith('uploads/')) {
    const normalizedPath = value.startsWith('/') ? value : `/${value}`;
    return `${API_ORIGIN}${normalizedPath}`;
  }

  const withProtocol = value.startsWith('//') ? `https:${value}` : value;

  try {
    const parsed = new URL(withProtocol, window.location.origin);
    if (
      parsed.protocol === 'http:' &&
      window.location.protocol === 'https:' &&
      parsed.hostname !== 'localhost' &&
      parsed.hostname !== '127.0.0.1'
    ) {
      parsed.protocol = 'https:';
    }
    return encodeURI(parsed.toString());
  } catch {
    return '';
  }
}

function getPostImages(post) {
  const seen = new Set();
  const list = [];
  const pushUrl = (value) => {
    const url = String(value || '').trim();
    if (!url || seen.has(url)) return;
    seen.add(url);
    list.push(url);
  };

  if (Array.isArray(post?.images)) {
    post.images.forEach(pushUrl);
  }
  pushUrl(post?.image);
  return list;
}

export function HBProductionStoryPage() {
  const { storyId } = useParams();
  const [story, setStory] = useState(null);
  const [failedImages, setFailedImages] = useState({});
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let active = true;
    api
      .get('/public/hb-productions')
      .then((response) => {
        if (!active) return;
        const stories = response.posts || [];
        const matched = stories.find((item) => item.id === storyId);
        setStory(matched || null);
        setStatus(matched ? 'ready' : 'not_found');
      })
      .catch(() => {
        if (!active) return;
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [storyId]);

  const storyImages = useMemo(() => {
    return story ? getPostImages(story).map((img) => resolveStoryImageSrc(img)).filter(Boolean) : [];
  }, [story]);

  if (status === 'loading') {
    return (
      <section className="hb-story-page">
        <div className="hb-story-shell">
          <p className="hb-story-status">Loading story...</p>
        </div>
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className="hb-story-page">
        <div className="hb-story-shell">
          <p className="hb-story-status">Could not load this story right now.</p>
          <Link className="hb-story-back" to="/hb-productions">BACK TO STORIES</Link>
        </div>
      </section>
    );
  }

  if (status === 'not_found' || !story) {
    return (
      <section className="hb-story-page">
        <div className="hb-story-shell">
          <p className="hb-story-status">Story not found.</p>
          <Link className="hb-story-back" to="/hb-productions">BACK TO STORIES</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="hb-story-page">
      <div className="hb-story-shell">
        <header className="hb-story-head">
          <p>HB PRODUCTIONS</p>
          <h1>{story.title}</h1>
          {story.excerpt && <h2>{story.excerpt}</h2>}
        </header>

        {storyImages.length > 0 && (
          <div className="hb-story-gallery">
            {storyImages.map((src, index) => (
              <figure className="hb-story-figure" key={`${src}-${index}`}>
                {!failedImages[`${src}-${index}`] ? (
                  <img
                    src={src}
                    alt={`${story.title} ${index + 1}`}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    referrerPolicy="no-referrer"
                    onError={() => setFailedImages((prev) => ({ ...prev, [`${src}-${index}`]: true }))}
                  />
                ) : (
                  <div className="hb-story-image-fallback">Image unavailable</div>
                )}
              </figure>
            ))}
          </div>
        )}

        <article className="hb-story-body">
          {String(story.body || '')
            .split(/\n+/)
            .map((paragraph, index) => paragraph.trim())
            .filter(Boolean)
            .map((paragraph, index) => (
              <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
            ))}
        </article>

        <div className="hb-story-actions">
          <Link className="hb-story-back" to="/hb-productions">BACK TO STORIES</Link>
        </div>
      </div>
    </section>
  );
}

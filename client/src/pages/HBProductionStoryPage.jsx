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

    // If admin saved a localhost upload URL, rewrite it to current API origin for other devices.
    if (
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
      parsed.pathname.startsWith('/uploads/')
    ) {
      return `${API_ORIGIN}${parsed.pathname}${parsed.search || ''}`;
    }

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
  const coverImage = storyImages[0] || '';
  const galleryImages = storyImages.slice(1);
  const repeatedGalleryImages = useMemo(() => {
    if (galleryImages.length <= 1) return galleryImages;
    return [...galleryImages, ...galleryImages];
  }, [galleryImages]);
  const galleryPosition = story?.galleryPosition === 'below_text' ? 'below_text' : 'above_text';

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

        {coverImage && (
          <div className="hb-story-gallery">
            <figure className="hb-story-figure hb-story-figure--main" key={`${coverImage}-0`}>
              {!failedImages[`${coverImage}-0`] ? (
                <img
                  src={coverImage}
                  alt={`${story.title} 1`}
                  loading="eager"
                  onError={() => setFailedImages((prev) => ({ ...prev, [`${coverImage}-0`]: true }))}
                />
              ) : (
                <div className="hb-story-image-fallback">Image unavailable</div>
              )}
            </figure>
          </div>
        )}

        {galleryImages.length > 0 && galleryPosition === 'above_text' && (
          <div className="hb-story-gallery-strip" aria-label="Story gallery">
            <div className={`hb-story-gallery-track${galleryImages.length > 1 ? ' is-looping' : ''}`}>
              {repeatedGalleryImages.map((src, index) => {
                const imageKey = `${src}-${index + 1}`;
                return (
                  <figure className="hb-story-figure hb-story-figure--strip" key={imageKey}>
                    {!failedImages[src] ? (
                      <img
                        src={src}
                        alt={`${story.title} ${index + 2}`}
                        loading="lazy"
                        onError={() => setFailedImages((prev) => ({ ...prev, [src]: true }))}
                      />
                    ) : (
                      <div className="hb-story-image-fallback">Image unavailable</div>
                    )}
                  </figure>
                );
              })}
            </div>
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

        {galleryImages.length > 0 && galleryPosition === 'below_text' && (
          <div className="hb-story-gallery-strip" aria-label="Story gallery">
            <div className={`hb-story-gallery-track${galleryImages.length > 1 ? ' is-looping' : ''}`}>
              {repeatedGalleryImages.map((src, index) => {
                const imageKey = `${src}-${index + 1}`;
                return (
                  <figure className="hb-story-figure hb-story-figure--strip" key={imageKey}>
                    {!failedImages[src] ? (
                      <img
                        src={src}
                        alt={`${story.title} ${index + 2}`}
                        loading="lazy"
                        onError={() => setFailedImages((prev) => ({ ...prev, [src]: true }))}
                      />
                    ) : (
                      <div className="hb-story-image-fallback">Image unavailable</div>
                    )}
                  </figure>
                );
              })}
            </div>
          </div>
        )}

        <div className="hb-story-actions">
          <Link className="hb-story-back" to="/hb-productions">BACK TO STORIES</Link>
        </div>
      </div>
    </section>
  );
}

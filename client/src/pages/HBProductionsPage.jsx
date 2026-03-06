import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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

export function HBProductionsPage() {
  const [posts, setPosts] = useState([]);
  const [failedImages, setFailedImages] = useState({});

  useEffect(() => {
    api.get('/public/hb-productions').then((response) => setPosts(response.posts || [])).catch(() => {});
  }, []);

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [posts]);

  return (
    <section className="hb-list-page">
      <div className="hb-list-shell">
        <header className="hb-list-head">
          <h1>HB PRODUCTIONS</h1>
        </header>

        <div className="hb-list-grid">
          {sortedPosts.map((post) => {
            const images = getPostImages(post);
            const cover = resolveStoryImageSrc(images[0] || '');
            return (
              <article className="hb-story-card" key={post.id}>
                <Link className="hb-story-media" to={`/hb-productions/${encodeURIComponent(post.id)}`}>
                  {cover && !failedImages[post.id] ? (
                    <img
                      src={cover}
                      alt={post.title}
                      loading="lazy"
                      onError={() => setFailedImages((prev) => ({ ...prev, [post.id]: true }))}
                    />
                  ) : (
                    <div className="hb-story-media-fallback">{post.title}</div>
                  )}
                </Link>
                <div className="hb-story-copy">
                  <h2>{post.title}</h2>
                  {post.excerpt && <p>{post.excerpt}</p>}
                  <Link className="hb-story-explore" to={`/hb-productions/${encodeURIComponent(post.id)}`}>
                    EXPLORE
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import { useEffect, useState } from 'react';
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

export function HBProductionsPage() {
  const [posts, setPosts] = useState([]);
  const [failedImages, setFailedImages] = useState({});

  useEffect(() => {
    api.get('/public/hb-productions').then((response) => setPosts(response.posts));
  }, []);

  return (
    <section className="content-page">
      <div className="content-page-inner">
        <h1>HB PRODUCTIONS</h1>
        <div className="blog-grid" style={{ marginTop: '3rem' }}>
          {posts.map((post) => (
            <article key={post.id} id={post.id} className="blog-card">
              {post.image && !failedImages[post.id] && (
                <img
                  src={resolveStoryImageSrc(post.image)}
                  alt={post.title}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={() => setFailedImages((prev) => ({ ...prev, [post.id]: true }))}
                />
              )}
              <h3>{post.title}</h3>
              <p>{post.excerpt}</p>
              <small>{post.body}</small>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

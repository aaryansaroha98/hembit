import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { getPostImages, resolveStoryImageSrc } from '../utils/hbMedia';

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

import { useEffect, useState } from 'react';
import { api } from '../services/api';

export function HBProductionsPage() {
  const [posts, setPosts] = useState([]);

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
              {post.image && <img src={post.image} alt={post.title} />}
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

import { useEffect, useState } from 'react';
import { PageHero } from '../components/PageHero';
import { api } from '../services/api';

export function HBProductionsPage() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    api.get('/public/hb-productions').then((response) => setPosts(response.posts));
  }, []);

  return (
    <section>
      <PageHero title="HB Productions" subtitle="Stories and Concepts" />
      <div className="blog-grid section-pad">
        {posts.map((post) => (
          <article key={post.id} className="blog-card">
            {post.image && <img src={post.image} alt={post.title} />}
            <h3>{post.title}</h3>
            <p>{post.excerpt}</p>
            <small>{post.body}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

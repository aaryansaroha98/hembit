export function PageHero({ title, subtitle }) {
  return (
    <section className="page-hero">
      <p>{subtitle}</p>
      <h1>{title}</h1>
    </section>
  );
}

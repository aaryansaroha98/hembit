import { Link } from 'react-router-dom';
import { Seo, siteUrl } from '../components/Seo';

const founderName = 'Aaryan Saroha';

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'HEMBIT',
  url: siteUrl,
  logo: `${siteUrl}/favicon.png`,
  sameAs: [
    'https://www.instagram.com/hembit.in/',
    'https://www.linkedin.com/company/hembit/',
    'https://youtube.com/@hembit.support',
  ],
};

const founderSchema = {
  '@context': 'https://schema.org',
  '@type': 'ProfilePage',
  name: `${founderName} | Founder of HEMBIT`,
  url: `${siteUrl}/founder-story`,
  mainEntity: {
    '@type': 'Person',
    name: founderName,
    jobTitle: 'Founder of HEMBIT',
    worksFor: { '@type': 'Organization', name: 'HEMBIT', url: siteUrl },
    sameAs: [
      'https://www.linkedin.com/in/aaryan-saroha-4301a3378/',
      'https://x.com/aaryan_sar60649',
    ],
  },
};

function ContentLayout({ eyebrow, title, children }) {
  return (
    <main className="content-page">
      <div className="content-page-inner">
        <p className="content-page-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <div className="content-page-body">{children}</div>
      </div>
    </main>
  );
}

export function OurStoryPage() {
  return (
    <>
      <Seo
        title="About HEMBIT | Modern Clothing Built with Intention"
        description="Discover HEMBIT, an India-based fashion commerce platform creating modern clothing with a focused design language, quality materials, and intention behind every piece."
        path="/our-story"
        schema={{
          ...organizationSchema,
          '@type': 'AboutPage',
          name: 'About HEMBIT',
          description: 'The story and design philosophy behind HEMBIT modern clothing.',
        }}
      />
      <ContentLayout eyebrow="THE HOUSE OF HEMBIT" title="About HEMBIT">
        <p className="content-page-lead">
          HEMBIT creates modern clothing for people who want expressive style without losing precision.
        </p>
        <h2>Modern clothing, considered from the beginning</h2>
        <p>
          HEMBIT is a fashion and commerce platform built around a focused design language. We look for the point where a strong idea, disciplined tailoring, and everyday wearability meet. The result is clothing with a clear presence that can still become part of a real wardrobe.
        </p>
        <p>
          Every collection is approached with intention: the silhouette has a reason, the details support the whole, and quality is treated as part of the design rather than an afterthought. HEMBIT is not built around disposable trends. It is built for pieces that feel distinctive when they arrive and considered every time they are worn.
        </p>
        <h2>A focused fashion experience</h2>
        <p>
          The HEMBIT store brings product discovery, editorial storytelling, and customer support into one experience. Alongside the shop, <Link to="/hb-productions">HB Productions</Link> explores the ideas, references, and creative work behind the brand.
        </p>
        <p>
          We are building HEMBIT from India with a global point of view: direct in communication, careful in execution, and open to the people who give the clothes their meaning. That is the standard we use for the products we make and the service around them.
        </p>
        <div className="content-page-actions">
          <Link className="content-page-link" to="/shop">Explore the collection</Link>
          <Link className="content-page-link" to="/founder-story">Meet the founder</Link>
        </div>
      </ContentLayout>
    </>
  );
}

export function FounderStoryPage() {
  return (
    <>
      <Seo
        title="Aaryan Saroha | Founder of HEMBIT"
        description="Read the founder story of Aaryan Saroha, the entrepreneur behind HEMBIT, and how engineering, systems thinking, and expressive design shape the brand."
        path="/founder-story"
        type="profile"
        schema={founderSchema}
      />
      <ContentLayout eyebrow="FOUNDER STORY" title="Aaryan Saroha">
        <p className="content-page-lead">
          An entrepreneur building at the intersection of engineering, financial technology, and expressive design.
        </p>
        <h2>Building from first principles</h2>
        <p>
          Aaryan Saroha founded HEMBIT with a simple conviction: clothing can be expressive and exacting at the same time. The brand is a study in how a clear point of view becomes a product, how a product becomes a system, and how that system earns trust through consistent execution.
        </p>
        <p>
          His wider work spans financial technology, quantitative analysis, and real-time systems. That background brings a systems mindset to HEMBIT: understand the underlying structure, remove what is unnecessary, and pay attention to the details people feel even when they cannot immediately name them.
        </p>
        <h2>One founder, several disciplines</h2>
        <p>
          Alongside HEMBIT, Aaryan is the founder of Venturs Forum and Quantify Terminal. Across those ventures, the common thread is deliberate building: bringing people, information, and tools together so better decisions can be made with greater clarity.
        </p>
        <p>
          He is also an author. His writing examines ambition, conviction, and the discipline required to continue pursuing difficult goals before the evidence is complete. Those questions matter to HEMBIT too. A brand is not only what it sells; it is the standard it keeps choosing when nobody is asking for an explanation.
        </p>
        <h2>The direction of HEMBIT</h2>
        <p>
          HEMBIT is being built as a long-term fashion house: modern in its visual language, rigorous in its process, and human in the way it meets its community. The aim is not to make more noise. It is to make better pieces, tell more honest stories, and give people a reason to return.
        </p>
        <div className="content-page-actions">
          <a className="content-page-link" href="https://www.linkedin.com/in/aaryan-saroha-4301a3378/" target="_blank" rel="noreferrer">LinkedIn</a>
          <Link className="content-page-link" to="/our-story">About HEMBIT</Link>
          <Link className="content-page-link" to="/shop">Shop HEMBIT</Link>
        </div>
      </ContentLayout>
    </>
  );
}

function LegalPage({ title, description, path, children }) {
  return (
    <>
      <Seo title={`${title} | HEMBIT`} description={description} path={path} />
      <ContentLayout eyebrow="HEMBIT" title={title}>{children}</ContentLayout>
    </>
  );
}

export function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Notice" path="/privacy-policy" description="Read the HEMBIT privacy notice and learn how information is used to provide the store and fulfil orders.">
      <p>HEMBIT collects the information needed to provide the store, fulfil orders, communicate with customers, and improve service quality.</p>
      <p>We do not ask for information that is unrelated to those purposes. Payment details are handled by the relevant payment provider, and account information is protected using appropriate technical and organisational measures.</p>
      <p>For privacy questions, contact the HEMBIT support team through the contact details provided on the website.</p>
    </LegalPage>
  );
}

export function TermsPage() {
  return (
    <LegalPage title="Terms of Use" path="/terms-of-use" description="Read the HEMBIT terms of use covering the website, orders, payments, shipping, and customer accounts.">
      <p>By using HEMBIT, you agree to use the website lawfully and to provide accurate information when creating an account or placing an order.</p>
      <p>Orders are subject to product availability, payment confirmation, shipping conditions, and the applicable return or exchange terms shown at the time of purchase.</p>
      <p>HEMBIT may update these terms as the store and its services develop. The current version is published on this page.</p>
    </LegalPage>
  );
}

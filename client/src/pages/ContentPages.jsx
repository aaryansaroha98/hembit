import { Link } from 'react-router-dom';
import { Seo, siteUrl } from '../components/Seo';

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
  name: 'Jaswinder Saroha and Aaryan Saroha | HEMBIT Founders',
  url: `${siteUrl}/founder-story`,
  mainEntity: [
    {
      '@type': 'Person',
      name: 'Jaswinder Saroha',
      jobTitle: 'Founder of HEMBIT and Managing Director of Quantify Terminal',
      worksFor: [
        { '@type': 'Organization', name: 'HEMBIT', url: siteUrl },
        { '@type': 'Organization', name: 'Quantify Terminal' },
      ],
    },
    {
      '@type': 'Person',
      name: 'Aaryan Saroha',
      jobTitle: 'Co-Founder of HEMBIT and Founder & CEO of Quantify Terminal',
      worksFor: [
        { '@type': 'Organization', name: 'HEMBIT', url: siteUrl },
        { '@type': 'Organization', name: 'Quantify Terminal' },
      ],
      sameAs: [
        'https://x.com/aaryan_sar60649',
      ],
    },
  ],
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
      </ContentLayout>
    </>
  );
}

export function FounderStoryPage() {
  return (
    <>
      <Seo
        title="Jaswinder and Aaryan Saroha | HEMBIT Founders"
        description="Meet HEMBIT founders Jaswinder Saroha and Aaryan Saroha, two brothers bringing mathematics, technology, financial intelligence, and creative design together."
        path="/founder-story"
        type="profile"
        schema={founderSchema}
      />
      <ContentLayout eyebrow="FOUNDER STORY" title="Jaswinder Saroha & Aaryan Saroha">
        <p className="content-page-lead">
          Two brothers. Distinct disciplines. One shared ambition to build something enduring.
        </p>
        <h2>Two perspectives, one direction</h2>
        <p>
          HEMBIT was founded by Jaswinder Saroha and Aaryan Saroha, two brothers whose distinct disciplines, perspectives, and strengths come together through a shared ambition to build something enduring.
        </p>
        <p>
          What began as an idea around clothing evolved into a broader pursuit: to create a brand defined not by passing trends, but by identity, restraint, craftsmanship, and permanence.
        </p>
        <h2>Jaswinder Saroha</h2>
        <p>
          Jaswinder Saroha, Founder of HEMBIT and Managing Director of Quantify Terminal, brings an analytical perspective shaped by mathematics and interests across quantitative finance, mathematical modelling, financial markets, systematic research, and algorithmic trading.
        </p>
        <p>
          His mathematical foundation influences the way he approaches entrepreneurship and business strategy: through structure, precision, disciplined decision-making, and long-term thinking. Alongside HEMBIT, Jaswinder contributes to the development and direction of Quantify Terminal, a financial intelligence and analytics platform spanning market research, quantitative analysis, portfolio intelligence, risk management, algorithmic workflows, and financial technology.
        </p>
        <p>
          His work across consumer business and financial technology brings a multidisciplinary perspective that combines mathematical thinking with practical business execution.
        </p>
        <h2>Aaryan Saroha</h2>
        <p>
          Aaryan Saroha, Co-Founder of HEMBIT and Founder & CEO of Quantify Terminal, represents the entrepreneurial, technological, financial, and creative dimension of the partnership.
        </p>
        <p>
          An undergraduate at the Indian Institute of Technology Jammu, Aaryan's interests span entrepreneurship, technology, financial markets, financial technology, software and product engineering, artificial intelligence, and creative design.
        </p>
        <p>
          As Founder & CEO of Quantify Terminal, Aaryan leads the vision and development of a financial technology platform focused on professional-grade market intelligence, quantitative research, portfolio analytics, risk management, and advanced financial workflows. His entrepreneurial work extends beyond technology into product direction, visual identity, digital experiences, branding, creative strategy, and design, disciplines that also influence the character and presentation of HEMBIT.
        </p>
        <h2>The HEMBIT philosophy</h2>
        <p>
          At the foundation of HEMBIT is a belief shared by both brothers: the world can be made better through design. Not design as decoration, but design as a way of thinking.
        </p>
        <p>
          Design determines how an object feels, how a space is experienced, how technology becomes intuitive, how clothing becomes personal, and how an idea becomes part of culture. For Jaswinder and Aaryan, design is not confined to fashion. It exists wherever intention meets execution: in a garment, a product, a piece of technology, a business, or an entire system.
        </p>
        <p>
          That belief shapes HEMBIT. What we create should have a reason to exist. Every proportion, material, silhouette, detail, and decision should contribute to something more considered than what came before.
        </p>
        <p>
          HEMBIT does not see clothing simply as product, nor fashion as an endless cycle of reinvention. We see clothing as an extension of identity: something capable of carrying memory, character, confidence, and culture.
        </p>
        <p>
          Our approach is intentionally timeless. Rather than designing around what is temporary, HEMBIT seeks to create pieces with permanence: considered silhouettes, enduring aesthetics, thoughtful construction, and a visual language that can remain relevant beyond a season.
        </p>
        <p>
          There is power in restraint. There is confidence in simplicity. And there is permanence in design that does not need to demand attention in order to be remembered.
        </p>
        <h2>Built to endure</h2>
        <p>
          The ambition of HEMBIT is larger than any individual collection. It is to build a house with its own point of view, one that evolves without abandoning its identity and grows without becoming defined by the moment.
        </p>
        <p>
          The things that surround us shape the way we experience the world. If those things can be designed with greater thought, purpose, and beauty, then the world itself can be experienced differently.
        </p>
        <p>
          HEMBIT exists to contribute to that idea: creation over imitation, intention over excess, permanence over novelty, and building over following. Above all, it is a belief that design is one of the most powerful ways human beings can turn imagination into reality.
        </p>
        <p className="content-page-lead">
          Timeless in character. Intentional in design. Built to endure.
        </p>
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

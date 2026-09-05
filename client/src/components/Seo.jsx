import { useEffect } from 'react';

const SITE_URL = 'https://www.hembit.in';
const DEFAULT_IMAGE = `${SITE_URL}/favicon.png`;
const regionalHomePaths = {
  'en-IN': '/in/en',
  'en-US': '/us/en',
  'en-GB': '/uk/en',
  'en-EU': '/eu/en',
};

function upsertMeta(attribute, value, content) {
  let element = document.head.querySelector(`meta[${attribute}="${value}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, value);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

export function Seo({
  title,
  description,
  path = '/',
  type = 'website',
  image = DEFAULT_IMAGE,
  schema,
  noindex = false,
}) {
  useEffect(() => {
    const canonicalUrl = `${SITE_URL}${path}`;
    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:image', image);
    upsertMeta('name', 'twitter:card', 'summary');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    Object.entries(regionalHomePaths).forEach(([language, regionalPath]) => {
      let languageLink = document.head.querySelector(`link[rel="alternate"][hreflang="${language}"]`);
      if (!languageLink) {
        languageLink = document.createElement('link');
        languageLink.setAttribute('rel', 'alternate');
        languageLink.setAttribute('hreflang', language);
        document.head.appendChild(languageLink);
      }
      languageLink.setAttribute('href', `${SITE_URL}${regionalPath}`);
    });

    let globalLanguageLink = document.head.querySelector('link[rel="alternate"][hreflang="x-default"]');
    if (!globalLanguageLink) {
      globalLanguageLink = document.createElement('link');
      globalLanguageLink.setAttribute('rel', 'alternate');
      globalLanguageLink.setAttribute('hreflang', 'x-default');
      document.head.appendChild(globalLanguageLink);
    }
    globalLanguageLink.setAttribute('href', `${SITE_URL}/in/en`);

    const schemaScriptId = 'hembit-seo-schema';
    const existingSchema = document.getElementById(schemaScriptId);
    if (existingSchema) existingSchema.remove();
    if (schema) {
      const schemaScript = document.createElement('script');
      schemaScript.id = schemaScriptId;
      schemaScript.type = 'application/ld+json';
      schemaScript.textContent = JSON.stringify(schema);
      document.head.appendChild(schemaScript);
    }

    return () => {
      const activeSchema = document.getElementById(schemaScriptId);
      if (activeSchema) activeSchema.remove();
    };
  }, [description, image, noindex, path, schema, title, type]);

  return null;
}

export const siteUrl = SITE_URL;

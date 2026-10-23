import { useEffect } from 'react';

const SITE = 'Medora';

function setMeta(selector, attr, value) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

/**
 * Sets the document title, description, canonical URL and robots directive for the current page.
 * Pass noindex for private pages (chat, profile, referrals) so search engines skip them.
 */
export default function usePageMeta({ title, description, noindex = false }) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE}` : `${SITE} | Free AI Health Assistant for Cameroon`;
    document.title = fullTitle;
    if (description) {
      setMeta('meta[name="description"]', 'content', description);
      setMeta('meta[property="og:description"]', 'content', description);
    }
    setMeta('meta[property="og:title"]', 'content', fullTitle);
    setMeta('meta[name="robots"]', 'content', noindex ? 'noindex, nofollow' : 'index, follow');
    setMeta('link[rel="canonical"]', 'href', `${window.location.origin}${window.location.pathname}`);
  }, [title, description, noindex]);
}

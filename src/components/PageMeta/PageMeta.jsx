import { useEffect } from 'react';

export default function PageMeta({ title, description }) {
  useEffect(() => {
    const fullTitle = title
      ? `${title} — VoltaicOS`
      : 'VoltaicOS — EV Charging Intelligence Platform';
    document.title = fullTitle;

    const setMeta = (selector, attr, value) => {
      if (!value) return;
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        if (selector.includes('property=')) {
          el.setAttribute('property', selector.match(/property="([^"]+)"/)[1]);
        } else {
          el.setAttribute('name', selector.match(/name="([^"]+)"/)[1]);
        }
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', fullTitle);
    setMeta('meta[property="og:description"]', 'content', description);
  }, [title, description]);

  return null;
}

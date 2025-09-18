import React, { useEffect } from 'react';

export default function Seo({
  title = 'AI Diagnostic & Triage | Health Sphere',
  description = 'AI-powered health companion for report analysis, daily check-ins, and personalized insights.',
  url = 'https://evolveai-backend.onrender.com/',
  image = 'https://evolveai-backend.onrender.com/favicon.svg',
  noIndex = false,
  canonical,
}) {
  useEffect(() => {
    const defaultTitle = 'AI Diagnostic & Triage | Health Sphere';
    document.title = title || defaultTitle;

    function setMeta(name, content) {
      if (!content) return;
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    }

    function setOg(property, content) {
      if (!content) return;
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    }

    function setLink(rel, href) {
      if (!href) return;
      let link = document.querySelector(`link[rel="${rel}"]`);
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', rel);
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
    }

    setMeta('description', description);
    setMeta('robots', noIndex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large');

    setOg('og:type', 'website');
    setOg('og:title', title);
    setOg('og:description', description);
    setOg('og:url', url);
    setOg('og:image', image);

    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:image', image);

    setLink('canonical', canonical || url);
  }, [title, description, url, image, noIndex, canonical]);

  return null;
}



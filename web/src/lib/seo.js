export const SITE = 'https://catalogo-suplementos.pages.dev';
export const DEFAULT_IMAGE = `${SITE}/young-sports-man-training-gym.webp`;
export const DEFAULT_DESC =
  'Suplementos deportivos en La Habana: proteínas, creatina, electrolitos y más. Compra online con envío y pago en la entrega.';

function putMeta(attr, key, content) {
  if (!content) {
    document.head.querySelectorAll(`meta[${attr}="${key}"], meta[property="${key}"]`).forEach((m) => m.remove());
    return;
  }
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function putLink(rel, href) {
  const el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!href) {
    document.head.querySelectorAll(`link[rel="${rel}"]`).forEach((l) => l.remove());
    return;
  }
  if (el) el.setAttribute('href', href);
  else {
    const link = document.createElement('link');
    link.setAttribute('rel', rel);
    link.setAttribute('href', href);
    document.head.appendChild(link);
  }
}

function putJsonLd(data, id) {
  document.head.querySelectorAll(`script[data-seo-jsonld]`).forEach((s) => {
    if (!data) {
      s.remove();
      return;
    }
    try {
      const d = JSON.parse(s.textContent);
      if (d['@id'] === id) s.remove();
    } catch {}
  });
  if (!data) return;
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-seo-jsonld', '1');
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

function ogUrl(path) {
  if (!path) return SITE;
  if (/^https?:\/\//.test(path)) return path;
  return SITE + path;
}

function absImage(u) {
  if (!u) return DEFAULT_IMAGE;
  if (/^https?:\/\//.test(u)) return u;
  return SITE + u;
}

export function truncate(text, max = 155) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + '…';
}

export function setSeo({ title, description, image, canonical, noindex = false, jsonLd }) {
  document.title = title || document.title;
  const desc = truncate(description);
  putMeta('name', 'description', desc);
  putMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
  putMeta('property', 'og:title', title);
  putMeta('property', 'og:description', desc);
  putMeta('property', 'og:type', canonical === SITE ? 'website' : 'product');
  putMeta('property', 'og:url', ogUrl(canonical));
  putMeta('property', 'og:image', absImage(image));
  putMeta('property', 'og:site_name', 'Catálogo Suplementos Deportivos');
  putMeta('name', 'twitter:card', 'summary_large_image');
  putMeta('name', 'twitter:title', title);
  putMeta('name', 'twitter:description', desc);
  putMeta('name', 'twitter:image', absImage(image));
  putLink('canonical', ogUrl(canonical));
  putJsonLd(jsonLd, jsonLd && (jsonLd['@id'] || jsonLd.name));
}
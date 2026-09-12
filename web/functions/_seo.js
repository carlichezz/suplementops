export const SITE = 'https://catalogo-suplementos.pages.dev';
export const DEFAULT_IMAGE = `${SITE}/young-sports-man-training-gym.webp`;
export const DEFAULT_DESC =
  'Suplementos deportivos en La Habana: proteínas, creatina, electrolitos, snacks y accesorios. Compra online con envío y pago en la entrega.';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncate(text, max = 155) {
  const t = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + '…';
}

function absImage(u) {
  if (!u) return DEFAULT_IMAGE;
  if (/^https?:\/\//.test(u)) return u;
  return SITE + u;
}

function absolute(p) {
  if (!p) return SITE;
  if (/^https?:\/\//.test(p)) return p;
  return SITE + p;
}

function priceNum(precio) {
  const m = String(precio || '').replace(/[$,\s]/g, '').match(/\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function parseRating(r) {
  const m = String(r || '').match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function parseReviews(r) {
  const m = String(r || '').replace(/[^\d]/g, '');
  return m ? Number(m) : null;
}

function stockLevel(p) {
  const s = p.stock;
  return s === null || s === undefined ? null : Number(s);
}

function stripSeoMeta(html) {
  return html
    .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta[^>]+name="description"[^>]*>/gi, '')
    .replace(/<meta[^>]+name="robots"[^>]*>/gi, '')
    .replace(/<meta[^>]+name="keywords"[^>]*>/gi, '')
    .replace(/<meta[^>]+name="author"[^>]*>/gi, '')
    .replace(/<meta[^>]+property="og:[^"]*"[^>]*>/gi, '')
    .replace(/<meta[^>]+name="twitter:[^"]*"[^>]*>/gi, '')
    .replace(/<link[^>]+rel="canonical"[^>]*>/gi, '');
}

function withHead(html, headHtml) {
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${headHtml}\n</head>`);
  return headHtml + html;
}

function jsonLdScript(data) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<script type="application/ld+json" data-seo-jsonld="1">${json}</script>`;
}

function headTags({ title, description, image, canonical, noindex }) {
  const t = esc(title);
  const d = esc(truncate(description, 155));
  const img = absImage(image);
  const url = absolute(canonical);
  const noindexTag = noindex
    ? '<meta name="robots" content="noindex, nofollow" />'
    : '<meta name="robots" content="index, follow, max-image-preview:large" />';
  return `<title>${t}</title>
  <meta name="description" content="${d}" />
  <link rel="canonical" href="${url}" />
  ${noindexTag}
  <meta property="og:site_name" content="Catálogo Suplementos Deportivos" />
  <meta property="og:locale" content="es_CU" />
  <meta property="og:type" content="${url === SITE ? 'website' : 'product'}" />
  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${d}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${img}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${t}" />
  <meta name="twitter:description" content="${d}" />
  <meta name="twitter:image" content="${img}" />`;
}

export async function fetchShell(env, request, nextFn) {
  if (env && env.ASSETS) {
    const res = await env.ASSETS.fetch(new Request(new URL('/index.html', request.url), { method: 'GET' }));
    if (res.ok) return res.text();
  }
  if (nextFn) {
    const res = await nextFn();
    if (res.ok) return res.text();
  }
  throw new Error('No se pudo obtener el HTML base');
}

export function pageHtml(shell, { title, description, image, canonical, noindex, jsonLd }) {
  const clean = stripSeoMeta(shell);
  const ld = jsonLd ? jsonLdScript(jsonLd) : '';
  return withHead(clean, headTags({ title, description, image, canonical, noindex }) + ld);
}

export function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}

export async function buildProductPage(env, request, product, nextFn) {
  const id = product.id;
  const url = `${SITE}/product/${id}`;
  const desc = product.descripcion && product.descripcion !== product.titulo ? product.descripcion : product.titulo;
  const stock = stockLevel(product);
  const published = product.publicado != null ? Number(product.publicado) : 1;
  const availability = published !== 0 && (stock === null || stock > 0) ? 'InStock' : 'OutOfStock';

  const images = [product.imagen_url].filter(Boolean);
  if (product.imagenes_extra) {
    String(product.imagenes_extra)
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean)
      .forEach((u) => images.push(u));
  }

  const rating = parseRating(product.rating);
  const reviews = parseReviews(product.num_reviews);
  const price = priceNum(product.precio);
  const aggregateRating =
    rating != null && rating > 0 && reviews != null && reviews > 0
      ? {
          '@type': 'AggregateRating',
          ratingValue: Math.min(5, rating).toFixed(1),
          reviewCount: reviews,
          bestRating: 5,
        }
      : undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: product.titulo,
    description: desc,
    url,
    image: images.map(absImage),
    sku: product.asin || undefined,
    brand: { '@type': 'Brand', name: product.marca || 'Suplementos' },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'USD',
      price: price != null && price >= 0 ? price.toFixed(2) : '0',
      availability,
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Store', name: 'Catálogo Suplementos Deportivos' },
    },
    aggregateRating,
  };

  const shell = await fetchShell(env, request, nextFn);
  return pageHtml(shell, {
    title: `${product.titulo} · Suplementos Deportivos`,
    description: desc,
    image: product.imagen_url,
    canonical: `/product/${id}`,
    jsonLd,
  });
}

export async function buildSitemap(env) {
  const { results } = await env.DB.prepare(
    'SELECT id, scrapeado_en FROM productos WHERE publicado = 1 ORDER BY id ASC'
  ).all().catch(() => ({ results: [] }));

  const now = new Date().toISOString().slice(0, 10);
  const urls = [`<url><loc>${SITE}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`];
  for (const p of results) {
    const lastmod = p.scrapeado_en ? String(p.scrapeado_en).slice(0, 10) : now;
    urls.push(
      `<url><loc>${SITE}/product/${p.id}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`
    );
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}
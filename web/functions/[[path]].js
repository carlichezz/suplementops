import {
  SITE,
  DEFAULT_DESC,
  fetchShell,
  pageHtml,
  htmlResponse,
  buildProductPage,
  buildSitemap,
} from './_seo.js';

async function loadProduct(env, id) {
  const { results } = await env.DB.prepare(
    `SELECT p.*, c.nombre AS categoria_nombre
     FROM productos p
     LEFT JOIN categorias c ON c.id = p.categoria_id
     WHERE p.id = ?`
  )
    .bind(id)
    .all();
  return results[0] || null;
}

// Proxy del bucket público de Supabase, servido desde el propio origen. El
// origen responde 'cache-control: no-cache', lo que obligaba al navegador a
// re-descargar cada imagen al volver atrás (visible en móvil). Aquí se sirven
// con Cache-Control largo e immutable, y de paso quedan cacheadas por el SW
// (que ya cachea las imágenes del mismo origen).
const UPSTREAM_BASE = 'https://rkmaoovnzvvvgpxhczho.supabase.co/storage/v1/object/public/';

async function proxyImage(request, url) {
  const rel = url.pathname.slice('/img/'.length);
  if (!rel.startsWith('imagenes/')) {
    return new Response('Not Found', { status: 404 });
  }
  const accept = request.headers.get('accept') || '*/*';
  const resp = await fetch(UPSTREAM_BASE + rel, { headers: { accept } });
  const out = new Headers(resp.headers);
  out.delete('set-cookie');
  out.delete('content-disposition');
  if (resp.ok) {
    out.set('Content-Type', resp.headers.get('Content-Type') || 'image/webp');
    out.set('Cache-Control', 'public, max-age=31536000, immutable');
    return new Response(resp.body, { status: 200, headers: out });
  }
  out.set('Cache-Control', 'no-store');
  return new Response(resp.body, { status: resp.status, headers: out });
}

async function handleRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Imágenes del bucket público servidas desde el propio origen (ver proxyImage).
  if (path.startsWith('/img/')) {
    return proxyImage(request, url);
  }

  // Sitemap dinámico: lista la home y todos los productos publicados.
  if (path === '/sitemap.xml') {
    const xml = await buildSitemap(env);
    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'X-Robots-Tag': 'index, follow',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // Admin y checkout: no se indexan, pero sirven el mismo SPA (head noindex).
  // Se matchea también el slash final (p. ej. /checkout/) para no filtrar el head indexable.
  if (path === '/admin' || path.startsWith('/admin/')) {
    const shell = await fetchShell(env, request, next);
    return htmlResponse(
      pageHtml(shell, {
        title: 'Administrar · Catálogo Suplementos',
        description: DEFAULT_DESC,
        canonical: '/admin',
        noindex: true,
      })
    );
  }
  if (path === '/checkout' || path.startsWith('/checkout/')) {
    const shell = await fetchShell(env, request, next);
    return htmlResponse(
      pageHtml(shell, {
        title: 'Finalizar compra · Suplementos Deportivos',
        description: DEFAULT_DESC,
        canonical: '/checkout',
        noindex: true,
      })
    );
  }

  // Páginas de producto: prerenderizamos head + JSON-LD Product para bots / compartir.
  // Solo aceptamos /product/<id> numérico; cualquier otra ruta "product" es 404 noindex.
  if (path.startsWith('/product/')) {
    const m = /^\/product\/(\d+)/.exec(path);
    if (!m) {
      const shell = await fetchShell(env, request, next);
      return htmlResponse(
        pageHtml(shell, {
          title: 'Producto no encontrado · Suplementos Deportivos',
          description: DEFAULT_DESC,
          canonical: path,
          noindex: true,
        }),
        404
      );
    }
    const id = Number(m[1]);
    const product = await loadProduct(env, id);
    if (!product) {
      const shell = await fetchShell(env, request, next);
      return htmlResponse(
        pageHtml(shell, {
          title: 'Producto no encontrado · Suplementos Deportivos',
          description: DEFAULT_DESC,
          canonical: path,
          noindex: true,
        }),
        404
      );
    }
    return htmlResponse(await buildProductPage(env, request, product, next));
  }

  return next();
}

export const onRequestGet = handleRequest;
export const onRequestHead = handleRequest;

export { SITE };
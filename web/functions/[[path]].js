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

export async function onRequestGet(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

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
  if (path === '/admin' || path === '/checkout') {
    const shell = await fetchShell(env, request, next);
    const title = path === '/admin' ? 'Administrar · Catálogo Suplementos' : 'Finalizar compra · Suplementos Deportivos';
    return htmlResponse(
      pageHtml(shell, {
        title,
        description: DEFAULT_DESC,
        canonical: path,
        noindex: true,
      })
    );
  }

  // Páginas de producto: prerenderizamos head + JSON-LD Product para bots / compartir.
  const m = /^\/product\/(\d+)/.exec(path);
  if (m) {
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

export { SITE };
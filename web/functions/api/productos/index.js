import { requireAdmin } from '../_auth.js';

export const onRequestGet = async (context) => {
  const { env } = context;
  const { results } = await env.DB.prepare(
    `SELECT p.*, c.nombre AS categoria_nombre
     FROM productos p
     LEFT JOIN categorias c ON c.id = p.categoria_id
     ORDER BY p.id ASC`
  ).all();
  return Response.json(results);
};

export const onRequestPost = async (context) => {
  const { env, request } = context;

  const denied = await requireAdmin(env, request);
  if (denied) return denied;

  const body = await request.json();

  const {
    titulo, descripcion, titulo_es, descripcion_es, precio,
    imagen_url, imagen_alt,
    stock, categoria_id, imagenes_extra, publicado,
  } = body;

  if (!titulo) {
    return Response.json({ error: 'El título es obligatorio' }, { status: 400 });
  }

  const { success } = await env.DB.prepare(
    `INSERT INTO productos
      (titulo, descripcion, titulo_es, descripcion_es, precio,
       imagen_url, imagen_alt, stock, categoria_id, imagenes_extra, publicado, scrapeado_en)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  )
    .bind(
      titulo, descripcion || null,
      titulo_es || null, descripcion_es || null,
      precio || null, imagen_url || null,
      imagen_alt || null, stock ?? 10, categoria_id || null,
      imagenes_extra || null, publicado == null ? 1 : Number(publicado)
    )
    .run();

  if (!success) {
    return Response.json({ error: 'No se pudo crear el producto' }, { status: 500 });
  }

  return Response.json({ ok: true }, { status: 201 });
};

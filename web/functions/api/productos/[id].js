import { requireAdmin } from '../_auth.js';

export const onRequestGet = async (context) => {
  const { env, params } = context;
  const { id } = params;
  const result = await env.DB.prepare(
    `SELECT p.*, c.nombre AS categoria_nombre
     FROM productos p
     LEFT JOIN categorias c ON c.id = p.categoria_id
     WHERE p.id = ?`
  )
    .bind(id)
    .first();

  if (!result) {
    return Response.json({ error: 'Producto no encontrado' }, { status: 404 });
  }

  return Response.json(result);
};

export const onRequestPut = async (context) => {
  const { env, params, request } = context;

  const denied = await requireAdmin(env, request);
  if (denied) return denied;

  const { id } = params;
  const body = await request.json();

  const {
    asin, ranking, titulo, descripcion, precio, rating,
    num_reviews, num_ofertas, url_producto, imagen_url, imagen_alt,
    stock, categoria_id, imagenes_extra,
  } = body;

  const existing = await env.DB.prepare('SELECT id FROM productos WHERE id = ?')
    .bind(id)
    .first();

  if (!existing) {
    return Response.json({ error: 'Producto no encontrado' }, { status: 404 });
  }

  const { success } = await env.DB.prepare(
    `UPDATE productos SET
       asin = ?, ranking = ?, titulo = ?, descripcion = ?, precio = ?,
       rating = ?, num_reviews = ?, num_ofertas = ?, url_producto = ?,
       imagen_url = ?, imagen_alt = ?, stock = ?, categoria_id = ?,
       imagenes_extra = ?
     WHERE id = ?`
  )
    .bind(
      asin || null, ranking || null, titulo || '', descripcion || null,
      precio || null, rating || null, num_reviews || null,
      num_ofertas || null, url_producto || null, imagen_url || null,
      imagen_alt || null, stock ?? 10, categoria_id || null,
      imagenes_extra || null, id
    )
    .run();

  if (!success) {
    return Response.json({ error: 'No se pudo actualizar el producto' }, { status: 500 });
  }

  return Response.json({ ok: true });
};

export const onRequestDelete = async (context) => {
  const { env, params, request } = context;

  const denied = await requireAdmin(env, request);
  if (denied) return denied;

  const { id } = params;

  const { success } = await env.DB.prepare('DELETE FROM productos WHERE id = ?')
    .bind(id)
    .run();

  if (!success) {
    return Response.json({ error: 'No se pudo eliminar el producto' }, { status: 500 });
  }

  return Response.json({ ok: true });
};

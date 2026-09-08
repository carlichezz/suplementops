import { requireAdmin } from '../_auth.js';
import { loadVariaciones, replaceVariaciones } from '../_variaciones.js';

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

  const vars = await loadVariaciones(env, [id]);
  result.atributos = result.atributos ? JSON.parse(result.atributos) : [];
  result.variaciones = vars.map(({ producto_id, ...rest }) => rest);

  return Response.json(result);
};

export const onRequestPut = async (context) => {
  const { env, params, request } = context;

  const denied = await requireAdmin(env, request);
  if (denied) return denied;

  const { id } = params;
  const body = await request.json();

  const {
    titulo, descripcion, titulo_es, descripcion_es, precio,
    imagen_url, imagen_alt,
    stock, categoria_id, imagenes_extra, publicado, atributos, variaciones,
  } = body;

  const existing = await env.DB.prepare('SELECT id FROM productos WHERE id = ?')
    .bind(id)
    .first();

  if (!existing) {
    return Response.json({ error: 'Producto no encontrado' }, { status: 404 });
  }

  const attrJson = atributos && Array.isArray(atributos) && atributos.length ? JSON.stringify(atributos) : null;

  const { success } = await env.DB.prepare(
    `UPDATE productos SET
       titulo = ?, descripcion = ?, titulo_es = ?,
       descripcion_es = ?, precio = ?, imagen_url = ?, imagen_alt = ?,
       stock = ?, categoria_id = ?, imagenes_extra = ?, publicado = ?, atributos = ?
     WHERE id = ?`
  )
    .bind(
      titulo || '', descripcion || null,
      titulo_es || null, descripcion_es || null,
      precio || null, imagen_url || null,
      imagen_alt || null, stock ?? 10, categoria_id || null,
      imagenes_extra || null, publicado == null ? 1 : Number(publicado), attrJson, id
    )
    .run();

  if (!success) {
    return Response.json({ error: 'No se pudo actualizar el producto' }, { status: 500 });
  }

  if (variaciones !== undefined) {
    await replaceVariaciones(env, id, variaciones);
  }

  return Response.json({ ok: true });
};

export const onRequestDelete = async (context) => {
  const { env, params, request } = context;

  const denied = await requireAdmin(env, request);
  if (denied) return denied;

  const { id } = params;

  const { success } = await env.DB.prepare('DELETE FROM variaciones WHERE producto_id = ?')
    .bind(id)
    .run();
  if (!success) {
    return Response.json({ error: 'No se pudo eliminar el producto' }, { status: 500 });
  }

  const del = await env.DB.prepare('DELETE FROM productos WHERE id = ?').bind(id).run();
  if (!del.success) {
    return Response.json({ error: 'No se pudo eliminar el producto' }, { status: 500 });
  }

  return Response.json({ ok: true });
};

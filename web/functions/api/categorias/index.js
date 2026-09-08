import { requireAdmin } from '../_auth.js';

export const onRequestGet = async (context) => {
  const { env } = context;
  const { results } = await env.DB.prepare(
    `SELECT c.*, COUNT(p.id) AS num_productos
     FROM categorias c
     LEFT JOIN productos p ON p.categoria_id = c.id
     GROUP BY c.id
     ORDER BY c.id ASC`
  ).all();
  return Response.json(results);
};

export const onRequestPost = async (context) => {
  const { env, request } = context;

  const denied = await requireAdmin(env, request);
  if (denied) return denied;

  const body = await request.json();
  const { nombre } = body;

  if (!nombre || !String(nombre).trim()) {
    return Response.json({ error: 'El nombre de la categoría es obligatorio' }, { status: 400 });
  }

  try {
    const { success, meta } = await env.DB.prepare(
      'INSERT INTO categorias (nombre, slug) VALUES (?, ?)'
    )
      .bind(
        String(nombre).trim(),
        String(nombre).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      )
      .run();

    if (!success) {
      return Response.json({ error: 'No se pudo crear la categoría' }, { status: 500 });
    }

    return Response.json({ ok: true, id: meta.last_row_id }, { status: 201 });
  } catch (err) {
    if (String(err).includes('UNIQUE')) {
      return Response.json({ error: 'La categoría ya existe' }, { status: 409 });
    }
    return Response.json({ error: 'No se pudo crear la categoría' }, { status: 500 });
  }
};

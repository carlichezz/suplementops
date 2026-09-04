import { requireAdmin } from '../_auth.js';

export const onRequestPut = async (context) => {
  const { env, params, request } = context;

  const denied = await requireAdmin(env, request);
  if (denied) return denied;

  const { id } = params;
  const body = await request.json();
  const { nombre } = body;

  if (!nombre || !String(nombre).trim()) {
    return Response.json({ error: 'El nombre de la categoría es obligatorio' }, { status: 400 });
  }

  const existing = await env.DB.prepare('SELECT id FROM categorias WHERE id = ?')
    .bind(id)
    .first();
  if (!existing) {
    return Response.json({ error: 'Categoría no encontrada' }, { status: 404 });
  }

  try {
    const { success } = await env.DB.prepare(
      'UPDATE categorias SET nombre = ?, slug = ? WHERE id = ?'
    )
      .bind(
        String(nombre).trim(),
        String(nombre).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        id
      )
      .run();

    if (!success) {
      return Response.json({ error: 'No se pudo actualizar la categoría' }, { status: 500 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    if (String(err).includes('UNIQUE')) {
      return Response.json({ error: 'La categoría ya existe' }, { status: 409 });
    }
    return Response.json({ error: 'No se pudo actualizar la categoría' }, { status: 500 });
  }
};

export const onRequestDelete = async (context) => {
  const { env, params, request } = context;

  const denied = await requireAdmin(env, request);
  if (denied) return denied;

  const { id } = params;

  const inUse = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM productos WHERE categoria_id = ?'
  )
    .bind(id)
    .first();

  if (inUse && inUse.n > 0) {
    return Response.json(
      { error: `No se puede eliminar: hay ${inUse.n} producto(s) en esta categoría` },
      { status: 409 }
    );
  }

  const { success } = await env.DB.prepare('DELETE FROM categorias WHERE id = ?')
    .bind(id)
    .run();

  if (!success) {
    return Response.json({ error: 'No se pudo eliminar la categoría' }, { status: 500 });
  }
  return Response.json({ ok: true });
};

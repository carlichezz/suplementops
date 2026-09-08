import { requireAdmin } from '../../_auth.js';
import { replaceVariaciones } from '../../_variaciones.js';

export const onRequestPut = async (context) => {
  const { env, params, request } = context;

  const denied = await requireAdmin(env, request);
  if (denied) return denied;

  const { id } = params;
  const body = await request.json();
  const { atributos, variaciones } = body;

  const existing = await env.DB.prepare('SELECT id FROM productos WHERE id = ?')
    .bind(id)
    .first();

  if (!existing) {
    return Response.json({ error: 'Producto no encontrado' }, { status: 404 });
  }

  const attrJson =
    atributos && Array.isArray(atributos) && atributos.length ? JSON.stringify(atributos) : null;

  const { success } = await env.DB.prepare(
    'UPDATE productos SET atributos = ? WHERE id = ?'
  )
    .bind(attrJson, id)
    .run();

  if (!success) {
    return Response.json({ error: 'No se pudo actualizar el producto' }, { status: 500 });
  }

  await replaceVariaciones(env, id, variaciones);

  return Response.json({ ok: true });
};
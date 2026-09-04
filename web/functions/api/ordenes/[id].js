import { requireAdmin } from '../_auth.js';

const ESTADOS = ['pendiente', 'despachada', 'entregada'];

export const onRequestGet = async (context) => {
  const { env, params, request } = context;

  const denied = await requireAdmin(env, request);
  if (denied) return denied;

  const { id } = params;
  const result = await env.DB.prepare('SELECT * FROM ordenes WHERE id = ?')
    .bind(id)
    .first();

  if (!result) {
    return Response.json({ error: 'Orden no encontrada' }, { status: 404 });
  }

  try {
    result.productos = JSON.parse(result.productos || '[]');
  } catch {
    result.productos = [];
  }

  return Response.json(result);
};

export const onRequestPut = async (context) => {
  const { env, params, request } = context;

  const denied = await requireAdmin(env, request);
  if (denied) return denied;

  const { id } = params;
  const body = await request.json();
  const { estado } = body;

  const order = await env.DB.prepare('SELECT * FROM ordenes WHERE id = ?')
    .bind(id)
    .first();
  if (!order) {
    return Response.json({ error: 'Orden no encontrada' }, { status: 404 });
  }

  if (!ESTADOS.includes(estado)) {
    return Response.json(
      { error: `Estado inválido. Válidos: ${ESTADOS.join(', ')}` },
      { status: 400 }
    );
  }

  const prevEstado = order.estado;
  let productos = [];
  try {
    productos = JSON.parse(order.productos || '[]');
  } catch {
    productos = [];
  }

  // Ajuste de stock al transicionar de estado
  const beingShipped = estado === 'despachada' && prevEstado !== 'despachada' && prevEstado !== 'entregada';
  const cancelShipping = prevEstado === 'despachada' && estado !== 'despachada';

  for (const p of productos) {
    const qty = Number(p.cantidad) || 1;
    if (!p.id) continue;
    if (beingShipped) {
      await env.DB.prepare(
        'UPDATE productos SET stock = MAX(0, stock - ?) WHERE id = ?'
      ).bind(qty, p.id).run();
    } else if (cancelShipping) {
      await env.DB.prepare(
        'UPDATE productos SET stock = stock + ? WHERE id = ?'
      ).bind(qty, p.id).run();
    }
  }

  const { success } = await env.DB.prepare(
    'UPDATE ordenes SET estado = ? WHERE id = ?'
  )
    .bind(estado, id)
    .run();

  if (!success) {
    return Response.json({ error: 'No se pudo actualizar la orden' }, { status: 500 });
  }

  return Response.json({ ok: true, id });
};

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

const moneyFmt = (n) => '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const onRequestPut = async (context) => {
  const { env, params, request } = context;

  const denied = await requireAdmin(env, request);
  if (denied) return denied;

  const { id } = params;
  const body = await request.json();
  const { estado, productos } = body;

  const order = await env.DB.prepare('SELECT * FROM ordenes WHERE id = ?')
    .bind(id)
    .first();
  if (!order) {
    return Response.json({ error: 'Orden no encontrada' }, { status: 404 });
  }

  if (productos === undefined && estado === undefined) {
    return Response.json(
      { error: 'Debés enviar estado y/o productos' },
      { status: 400 }
    );
  }

  const prevEstado = order.estado;

  // ---- Actualización de productos ----
  if (productos !== undefined) {
    if (!Array.isArray(productos)) {
      return Response.json({ error: 'Productos inválidos' }, { status: 400 });
    }

    let prevItems = [];
    try {
      prevItems = JSON.parse(order.productos || '[]');
    } catch {
      prevItems = [];
    }
    const prevQty = new Map(
      prevItems.map((p) => [`${Number(p.id)}:${p.variante_id ?? ''}`, Number(p.cantidad) || 1])
    );

    // Consolidar cantidades por producto+variante (por si llegan líneas repetidas)
    const cantidades = new Map();
    for (const p of productos) {
      const pid = Number(p.id);
      const vid = p.variante_id != null ? Number(p.variante_id) : null;
      const cantidad = parseInt(p.cantidad, 10);
      if (
        !Number.isFinite(pid) ||
        (vid != null && !Number.isFinite(vid)) ||
        !Number.isInteger(cantidad) ||
        cantidad < 1
      ) {
        return Response.json({ error: 'Cantidades inválidas.' }, { status: 400 });
      }
      const key = `${pid}:${vid ?? ''}`;
      cantidades.set(key, { pid, vid, cantidad: (cantidades.get(key)?.cantidad ?? 0) + cantidad });
    }
    if (cantidades.size === 0) {
      return Response.json({ error: 'La orden no puede quedar sin productos.' }, { status: 400 });
    }

    const ids = [...new Set([...cantidades.values()].map((c) => c.pid))];
    const placeholders = ids.map(() => '?').join(',');
    const { results } = await env.DB.prepare(
      `SELECT id, titulo, precio, stock FROM productos WHERE id IN (${placeholders})`
    )
      .bind(...ids)
      .all();
    const dbById = new Map(results.map((r) => [r.id, r]));
    let varsById = new Map();
    if (ids.length > 0) {
      const { results: vres } = await env.DB.prepare(
        `SELECT id, producto_id, nombre, precio, stock FROM variaciones WHERE producto_id IN (${placeholders})`
      )
        .bind(...ids)
        .all();
      varsById = new Map((vres || []).map((v) => [`${v.producto_id}:${v.id}`, v]));
    }

    // El stock ya fue descontado al despachar; luego se ajusta por delta.
    const stockAlreadyTaken = order.estado !== 'pendiente';

    let totalNum = 0;
    const itemsFinal = [];
    for (const { pid, vid, cantidad } of cantidades.values()) {
      const row = dbById.get(pid);
      if (!row) {
        return Response.json(
          { error: 'Uno de los productos del carrito ya no existe. Actualizá el catálogo.' },
          { status: 400 }
        );
      }
      const v = vid != null ? (varsById.get(`${pid}:${vid}`) || null) : null;
      if (vid != null && !v) {
        return Response.json({ error: 'Una variante del carrito ya no existe. Actualizá el catálogo.' }, { status: 400 });
      }
      const precioSr = v != null && v.precio ? v.precio : row.precio;
      const precio = parseFloat(String(precioSr || '0').replace(/[^0-9.]/g, ''));
      if (!Number.isFinite(precio) || precio < 0) {
        return Response.json({ error: 'Precio inválido en el catálogo.' }, { status: 500 });
      }
      const stock =
        v != null
          ? (v.stock == null ? Number(row.stock == null ? 0 : row.stock) : Number(v.stock))
          : (row.stock == null ? Infinity : Number(row.stock));
      const key = `${pid}:${vid ?? ''}`;
      const oldQty = prevQty.get(key) || 0;
      const delta = cantidad - oldQty;
      if (stockAlreadyTaken) {
        if (delta > 0 && stock < delta) {
          return Response.json(
            {
              error: `No hay suficiente stock de "${row.titulo}"${v ? ` (${v.nombre})` : ''} (disponible: ${Math.max(0, stock)}).`,
            },
            { status: 400 }
          );
        }
      } else if (stock < cantidad) {
        return Response.json(
          {
            error: `No hay suficiente stock de "${row.titulo}"${v ? ` (${v.nombre})` : ''} (disponible: ${Math.max(0, stock)}).`,
          },
          { status: 400 }
        );
      }
      totalNum += precio * cantidad;
      itemsFinal.push({
        id: pid,
        titulo: row.titulo,
        precio: precioSr,
        cantidad,
        variante_id: vid,
        variante_nombre: v ? v.nombre : null,
      });
    }

    // Ajustar stock por el delta cuando la orden ya movilizó stock
    if (stockAlreadyTaken) {
      for (const [key, oldQty] of prevQty) {
        const cur = cantidades.get(key);
        const newQty = cur ? cur.cantidad : 0;
        const delta = newQty - oldQty;
        if (delta === 0) continue;
        const [rawPid, rawVid] = key.split(':');
        const pid = Number(rawPid);
        const vid = rawVid === '' ? null : Number(rawVid);
        if (delta > 0) {
          await (vid != null
            ? env.DB.prepare('UPDATE variaciones SET stock = MAX(0, stock - ?) WHERE id = ?')
            : env.DB.prepare('UPDATE productos SET stock = MAX(0, stock - ?) WHERE id = ?'))
            .bind(delta, vid != null ? vid : pid)
            .run();
        } else {
          await (vid != null
            ? env.DB.prepare('UPDATE variaciones SET stock = stock + ? WHERE id = ?')
            : env.DB.prepare('UPDATE productos SET stock = stock + ? WHERE id = ?'))
            .bind(-delta, vid != null ? vid : pid)
            .run();
        }
      }
    }

    const total = moneyFmt(totalNum);
    const { success } = await env.DB.prepare(
      'UPDATE ordenes SET productos = ?, total = ? WHERE id = ?'
    )
      .bind(JSON.stringify(itemsFinal), total, id)
      .run();
    if (!success) {
      return Response.json({ error: 'No se pudo actualizar la orden' }, { status: 500 });
    }
  }

  // ---- Cambio de estado ----
  if (estado !== undefined) {
    if (!ESTADOS.includes(estado)) {
      return Response.json(
        { error: `Estado inválido. Válidos: ${ESTADOS.join(', ')}` },
        { status: 400 }
      );
    }

    let curItems = [];
    if (productos !== undefined) {
      const fresh = await env.DB.prepare('SELECT productos FROM ordenes WHERE id = ?')
        .bind(id)
        .first();
      try {
        curItems = JSON.parse(fresh.productos || '[]');
      } catch {
        curItems = [];
      }
    } else {
      try {
        curItems = JSON.parse(order.productos || '[]');
      } catch {
        curItems = [];
      }
    }

    // Ajuste de stock al transicionar de estado
    const beingShipped = estado === 'despachada' && prevEstado !== 'despachada' && prevEstado !== 'entregada';
    const cancelShipping = prevEstado === 'despachada' && estado !== 'despachada';

    for (const p of curItems) {
      const qty = Number(p.cantidad) || 1;
      if (!p.id) continue;
      const vid = p.variante_id != null ? Number(p.variante_id) : null;
      if (beingShipped) {
        await (vid != null
          ? env.DB.prepare('UPDATE variaciones SET stock = MAX(0, stock - ?) WHERE id = ?')
          : env.DB.prepare('UPDATE productos SET stock = MAX(0, stock - ?) WHERE id = ?'))
          .bind(qty, vid != null ? vid : p.id)
          .run();
      } else if (cancelShipping) {
        await (vid != null
          ? env.DB.prepare('UPDATE variaciones SET stock = stock + ? WHERE id = ?')
          : env.DB.prepare('UPDATE productos SET stock = stock + ? WHERE id = ?'))
          .bind(qty, vid != null ? vid : p.id)
          .run();
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
  }

  const freshOrder = await env.DB.prepare('SELECT total FROM ordenes WHERE id = ?')
    .bind(id)
    .first();

  return Response.json({ ok: true, id, total: freshOrder ? freshOrder.total : undefined });
};

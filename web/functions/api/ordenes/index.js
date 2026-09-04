import { requireAdmin } from '../_auth.js';

async function getChatIds(env) {
  try {
    const { results } = await env.DB.prepare('SELECT chat_id FROM chat_ids').all();
    if (results && results.length > 0) {
      return results.map((r) => String(r.chat_id).trim()).filter(Boolean);
    }
  } catch (e) {
    // tabla no existe o error; caemos al secret
  }
  return (env.TELEGRAM_CHAT_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function notifyTelegram(env, order) {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  const chatIds = await getChatIds(env);
  if (chatIds.length === 0) return;

  const total = order.total || 'N/A';
  const items = order.productos || '';

  const text =
    `*NUEVA ORDEN #${order.id}*\n` +
    `\n*Nombre:* ${order.nombre}` +
    `\n*Dirección:* ${order.direccion || '—'}` +
    `\n*Teléfono:* ${order.telefono || '—'}` +
    (order.telefono_alt ? `\n*Teléfono alt:* ${order.telefono_alt}` : '') +
    (order.nota ? `\n*Nota:* ${order.nota}` : '') +
    `\n\n*Productos:*\n${items}` +
    `\n\n*Total:* ${total}` +
    `\n\nEstado: *pendiente*`;

  for (const chatId of chatIds) {
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
      });

      if (order.lat != null && order.lon != null) {
        await fetch(`https://api.telegram.org/bot${token}/sendLocation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            latitude: order.lat,
            longitude: order.lon,
          }),
        });
      }
    } catch (e) {
      // No bloquear la creación de la orden si Telegram falla
    }
  }
}

export const onRequestPost = async (context) => {
  const { env, request } = context;
  const body = await request.json();

  const { nombre, direccion, lat, lon, telefono, telefono_alt, nota, productos, total } = body;

  if (!nombre || !String(nombre).trim()) {
    return Response.json({ error: 'El nombre es obligatorio' }, { status: 400 });
  }
  if (!telefono || !String(telefono).trim()) {
    return Response.json({ error: 'El teléfono es obligatorio' }, { status: 400 });
  }
  if (!productos || !Array.isArray(productos) || productos.length === 0) {
    return Response.json({ error: 'El carrito está vacío' }, { status: 400 });
  }

  const productosJson = JSON.stringify(productos);

  const { success, meta } = await env.DB.prepare(
    `INSERT INTO ordenes
      (nombre, direccion, lat, lon, telefono, telefono_alt, nota, productos, total, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`
  )
    .bind(
      String(nombre).trim(),
      direccion || null,
      lat != null ? lat : null,
      lon != null ? lon : null,
      String(telefono).trim(),
      telefono_alt || null,
      nota || null,
      productosJson,
      total != null ? String(total) : null
    )
    .run();

  if (!success) {
    return Response.json({ error: 'No se pudo crear la orden' }, { status: 500 });
  }

  const order = {
    id: meta.last_row_id,
    nombre: String(nombre).trim(),
    direccion,
    lat,
    lon,
    telefono,
    telefono_alt,
    nota,
    productos: productosJson,
    total,
  };

  // Notificar a Telegram en segundo plano
  context.waitUntil(notifyTelegram(env, order));

  return Response.json({ ok: true, id: meta.last_row_id }, { status: 201 });
};

export const onRequestGet = async (context) => {
  const { env, request } = context;

  const denied = await requireAdmin(env, request);
  if (denied) return denied;

  const url = new URL(request.url);
  const estado = url.searchParams.get('estado');

  let query = 'SELECT * FROM ordenes';
  const params = [];

  if (estado) {
    query += ' WHERE estado = ?';
    params.push(estado);
  }
  query += ' ORDER BY id DESC';

  const { results } = await env.DB.prepare(query).bind(...params).all();
  return Response.json(results);
};

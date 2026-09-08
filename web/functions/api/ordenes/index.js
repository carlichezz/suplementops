import { requireAdmin } from '../_auth.js';
import { clientKey, checkRateLimit, rateLimitResponse } from '../_rate-limit.js';

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

const esc = (s) =>
  String(s ?? '').replace(/[_*[\]`]/g, (m) => '\\' + m);

function moneyNum(n) {
  const num = parseFloat(String(n ?? '').replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return '';
  return '$' + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

async function notifyTelegram(env, order, origin) {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  const chatIds = await getChatIds(env);
  if (chatIds.length === 0) return;

  let prods = [];
  try {
    prods = typeof order.productos === 'string' ? JSON.parse(order.productos) : order.productos || [];
  } catch (e) {
    prods = [];
  }
  if (!Array.isArray(prods)) prods = [];

  const total = order.total || moneyNum(prods.reduce((acc, p) => acc + (parseFloat(String(p.precio || '0').replace(/[^0-9.]/g, '')) || 0) * (p.cantidad || 1), 0));

  const items = prods.length
    ? prods
        .map((p, i) => {
          const qty = p.cantidad || 1;
          const price = String(p.precio || '').trim();
          const sub = moneyNum((parseFloat(String(p.precio || '0').replace(/[^0-9.]/g, '')) || 0) * qty);
          return `${i + 1}. ${esc(p.titulo || 'Producto')}${p.variante_nombre ? ` (${esc(p.variante_nombre)})` : ''} × ${qty}${price ? ` · ${esc(price)}` : ''}${sub ? ` = ${sub}` : ''}`;
        })
        .join('\n')
    : '—';

  const fecha = order.creado_en ? new Date(order.creado_en) : null;
  const fechaStr =
    fecha && !isNaN(fecha)
      ? fecha.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '';

  const text =
    (fechaStr ? `📦 *NUEVA ORDEN* · ${fechaStr}\n` : `📦 *NUEVA ORDEN*\n`) +
    `\n🧾 *Orden #${order.id}*` +
    `\n👤 ${esc(order.nombre || '—')}` +
    (order.direccion ? `\n📍 ${esc(order.direccion)}` : '') +
    `\n📞 ${esc(order.telefono || '—')}` +
    (order.telefono_alt ? `\n· ${esc(order.telefono_alt)}` : '') +
    (order.nota ? `\n📝 ${esc(order.nota)}` : '') +
    `\n\n*🛒 Productos*\n${items}` +
    `\n\n💰 *Total:* ${esc(total)}` +
    `\n\nEstado: *pendiente*`;

  const keyboard = [];
  if (origin) {
    const url = `${origin}/admin?orden=${order.id}`;
    keyboard.push([{ text: '📂 Abrir orden', url: `https://t.me/iv?url=${encodeURIComponent(url)}` }]);
  }
  if (order.lat != null && order.lon != null) {
    keyboard.push([{ text: '🗺 Abrir en el mapa', url: `https://www.google.com/maps?q=${order.lat},${order.lon}` }]);
  }

  for (const chatId of chatIds) {
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
          ...(keyboard.length ? { reply_markup: { inline_keyboard: keyboard } } : {}),
        }),
      });

    } catch (e) {
      // No bloquear la creación de la orden si Telegram falla
    }
  }
}

export const onRequestPost = async (context) => {
  const { env, request } = context;

  const rl = await checkRateLimit(env, clientKey(request, 'ordenes'), 10, 10);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

  const body = await request.json();

  const { nombre, direccion, lat, lon, telefono, telefono_alt, nota, productos } = body;

  if (!nombre || !String(nombre).trim()) {
    return Response.json({ error: 'El nombre es obligatorio' }, { status: 400 });
  }
  if (!telefono || !String(telefono).trim()) {
    return Response.json({ error: 'El teléfono es obligatorio' }, { status: 400 });
  }
  if (!productos || !Array.isArray(productos) || productos.length === 0) {
    return Response.json({ error: 'El carrito está vacío' }, { status: 400 });
  }

  // Consolidar cantidades por producto+variante (por si el cliente repite líneas)
  const cantidades = new Map();
  for (const p of productos) {
    const id = Number(p.id);
    const vid = p.variante_id != null ? Number(p.variante_id) : null;
    const cantidad = parseInt(p.cantidad, 10);
    if (!Number.isFinite(id) || (vid != null && !Number.isFinite(vid)) || !Number.isInteger(cantidad) || cantidad < 1) {
      return Response.json({ error: 'Cantidades inválidas en el pedido.' }, { status: 400 });
    }
    const key = `${id}:${vid ?? ''}`;
    cantidades.set(key, { id, vid, cantidad: (cantidades.get(key)?.cantidad ?? 0) + cantidad });
  }

  // Validar existencia, stock y precio real contra la base de datos
  const ids = [...new Set([...cantidades.values()].map((c) => c.id))];
  const placeholders = ids.map(() => '?').join(',');
  const { results } = await env.DB.prepare(
    `SELECT id, titulo, precio, stock FROM productos WHERE id IN (${placeholders})`
  )
    .bind(...ids)
    .all();
  const dbById = new Map(results.map((r) => [r.id, r]));
  let varsById = null;
  if (ids.length > 0) {
    const { results: vres } = await env.DB.prepare(
      `SELECT id, producto_id, nombre, precio, stock FROM variaciones WHERE producto_id IN (${placeholders})`
    )
      .bind(...ids)
      .all();
    varsById = new Map((vres || []).map((v) => [`${v.producto_id}:${v.id}`, v]));
  }

  let totalNum = 0;
  const itemsFinal = [];
  for (const { id, vid, cantidad } of cantidades.values()) {
    const row = dbById.get(id);
    if (!row) {
      return Response.json(
        { error: 'Uno de los productos del carrito ya no existe. Actualizá el catálogo.' },
        { status: 400 }
      );
    }
    const v = vid != null ? (varsById.get(`${id}:${vid}`) || null) : null;
    if (vid != null && !v) {
      return Response.json({ error: 'Una variante del carrito ya no existe. Actualizá el catálogo.' }, { status: 400 });
    }
    const stock = v != null ? (v.stock == null ? Number(row.stock == null ? 0 : row.stock) : Number(v.stock)) : (row.stock == null ? Infinity : Number(row.stock));
    if (stock < cantidad) {
      return Response.json(
        {
          error: `No hay suficiente stock de "${row.titulo}"${v ? ` (${v.nombre})` : ''} (disponible: ${Math.max(0, stock)}).`,
        },
        { status: 400 }
      );
    }
    const precioSr = v != null && v.precio ? v.precio : row.precio;
    const precio = parseFloat(String(precioSr || '0').replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(precio) || precio < 0) {
      return Response.json({ error: 'Precio inválido en el catálogo.' }, { status: 500 });
    }
    totalNum += precio * cantidad;
    itemsFinal.push({
      id,
      titulo: row.titulo,
      precio: precioSr,
      cantidad,
      variante_id: vid,
      variante_nombre: v ? v.nombre : null,
    });
  }

  // El total SIEMPRE se recalcula en el servidor (se ignora el enviado por el cliente)
  const total = '$' + totalNum.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const productosJson = JSON.stringify(itemsFinal);

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
      total
    )
    .run();

  if (!success) {
    return Response.json({ error: 'No se pudo crear la orden' }, { status: 500 });
  }

  const order = {
    id: meta.last_row_id,
    creado_en: new Date().toISOString(),
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
  const origin = new URL(request.url).origin;
  context.waitUntil(notifyTelegram(env, order, origin));

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

// Helpers compartidos para variaciones de producto.

export function publicVariacion(v) {
  const out = {
    id: v.id,
    nombre: v.nombre,
    atributos: v.atributos ? JSON.parse(v.atributos) : {},
    precio: v.precio,
    stock: v.stock,
    pos: v.pos,
    imagen: v.imagen || null,
  };
  // Se mantiene producto_id para poder agrupar por producto en el listado.
  if (v.producto_id != null) out.producto_id = v.producto_id;
  return out;
}

export async function loadVariaciones(env, ids) {
  if (!ids || !ids.length) return [];
  const placeholders = ids.map(() => '?').join(',');
  const { results } = await env.DB.prepare(
    `SELECT * FROM variaciones WHERE producto_id IN (${placeholders}) ORDER BY producto_id, pos ASC`
  )
    .bind(...ids)
    .all();
  return results.map(publicVariacion);
}

export async function replaceVariaciones(env, productoId, variaciones) {
  await env.DB.prepare('DELETE FROM variaciones WHERE producto_id = ?').bind(productoId).run();
  const rows = (variaciones || [])
    .map((v, i) => [
      String(v.nombre || '').trim(),
      v.atributos,
      v.precio ?? null,
      v.stock ?? null,
      v.imagen || null,
      i,
    ])
    .filter((r) => r[0]);
  for (const [nombre, atributos, precio, stock, imagen, pos] of rows) {
    await env.DB.prepare(
      `INSERT INTO variaciones (producto_id, nombre, atributos, precio, stock, imagen, pos)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(productoId, nombre, JSON.stringify(atributos || {}), precio, stock, imagen, pos)
      .run();
  }
}
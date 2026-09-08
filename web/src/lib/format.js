export function money(n) {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function priceNum(p) {
  const n = parseFloat(String(p || '').replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

export function stockOf(p) {
  return p && p.stock != null ? p.stock : 999;
}

export function isSoldOut(p) {
  return stockOf(p) <= 0;
}

export function variantOf(p, varianteId) {
  if (!p || !p.variaciones || !varianteId) return null;
  return p.variaciones.find((v) => String(v.id) === String(varianteId)) || null;
}

export function variantPrice(p, varianteId) {
  const v = variantOf(p, varianteId);
  return v && v.precio ? String(v.precio) : (p ? p.precio : null);
}

export function variantStock(p, varianteId) {
  const v = variantOf(p, varianteId);
  const s = v && v.stock != null ? v.stock : (p ? p.stock : null);
  return s == null ? 999 : Math.max(0, Number(s) || 0);
}

export function lineKey(id, varianteId) {
  return varianteId ? `${id}:${varianteId}` : String(id);
}
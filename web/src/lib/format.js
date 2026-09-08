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
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

export function variantGroups(p) {
  const vs = Array.isArray(p && p.variaciones) ? p.variaciones : [];
  const map = new Map();
  for (const v of vs) {
    const a = v.atributos || {};
    for (const k of Object.keys(a)) {
      const val = String(a[k] ?? '').trim();
      if (!val) continue;
      if (!map.has(k)) map.set(k, []);
      const arr = map.get(k);
      if (!arr.includes(val)) arr.push(val);
    }
  }
  return [...map.entries()].map(([nombre, opciones]) => ({ nombre, opciones }));
}

const COLOR_HEX = {
  negro: '#1f2430', black: '#111111', 'negro/navy': '#14213d', gris: '#6b7280', gray: '#6b7280', grey: '#6b7280',
  blanco: '#ffffff', white: '#f8fafc', crema: '#f5f0e6', beige: '#d6c8a9',
  azul: '#2563eb', blue: '#2563eb', celeste: '#38bdf8', cyan: '#06b6d4', marino: '#1e3a8a', navy: '#1e3a8a',
  rojo: '#dc2626', red: '#dc2626', borgoña: '#7f1d1d', vino: '#7f1d1d', burgundy: '#7f1d1d',
  verde: '#16a34a', green: '#16a34a', esmeralda: '#10b981', oliva: '#65a30d', mint: '#5eead4', menta: '#5eead4',
  amarillo: '#facc15', yellow: '#facc15', oro: '#d4a017', gold: '#d4a017',
  naranja: '#ea580c', orange: '#ea580c', coral: '#ff6b6b',
  rosa: '#ec4899', pink: '#ec4899', rosado: '#ec4899',
  morado: '#7c3aed', purple: '#7c3aed', violeta: '#8b5cf6', violet: '#8b5cf6', lavanda: '#c4b5fd',
  marron: '#8b5a2b', brown: '#8b5a2b', 'cafe': '#6f4e37', coffee: '#6f4e37',
  turquesa: '#14b8a6', turquoise: '#14b8a6', teal: '#14b8a6',
  plata: '#c0c0c0', silver: '#c0c0c0', plateado: '#c0c0c0',
  transparente: 'transparent',
};

export function isColorGroup(name) {
  return /color|colour/i.test(String(name || ''));
}

export function colorHex(opcion) {
  const key = String(opcion || '').toLowerCase().trim();
  if (COLOR_HEX[key]) return COLOR_HEX[key];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 360;
  return `hsl(${h} 62% 42%)`;
}

export const SWATCH_FALLBACK = '#cccccc';

// Color a mostrar en el swatch: el guardado en el admin (RGB) o, si no hay,
// un color deducido del nombre de la opción. Nunca devuelve un valor inválido
// para <input type="color">.
export function swatchOf(colores, opcion) {
  const c = colores && colores[opcion];
  if (c && c !== 'transparent') return c;
  const h = colorHex(opcion);
  return h === 'transparent' ? SWATCH_FALLBACK : h;
}

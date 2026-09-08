// Genera una URL "SD" (redimensionada) para imágenes de Supabase Storage usando
// el endpoint de transformación de imagen. Si la URL no es de Supabase (ej.
// imágenes Amazon de productos viejos), devuelve la URL original tal cual.
const SEG = '/storage/v1/object/public/';

export function isSupabaseUrl(u) {
  return Boolean(u && u.includes(SEG));
}

export function hdUrl(u) {
  return u;
}

export function sdUrl(u, width = 600) {
  if (!isSupabaseUrl(u)) return u;
  const http = u.startsWith('https://') ? 'https://' : 'http://';
  const rest = u.slice(http.length);
  const i = rest.indexOf(SEG);
  if (i < 0) return u;
  const base = rest.slice(0, i);
  const filePath = rest.slice(i + SEG.length);
  return `${http}${base}/storage/v1/render/image/public/${filePath}?width=${width}&resize=contain&quality=72&format=auto`;
}

// onError para <img>: si la versión SD falla (ej. transform no habilitado en el
// proyecto Supabase) reintenta con la original; si la original también falla,
// oculta el elemento.
export function onImgFallback(e, hd) {
  const el = e.currentTarget;
  if (!el.dataset.fb) {
    el.dataset.fb = '1';
    el.src = hd;
  } else {
    el.style.display = 'none';
  }
}
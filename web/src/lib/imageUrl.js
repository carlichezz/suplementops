// Las imágenes se usan tal cual, sin transformaciones.
export function isSupabaseUrl() {
  return false;
}

export function hdUrl(u) {
  return u;
}

export function sdUrl(u) {
  return u;
}

const SUPABASE_PUBLIC = 'https://rkmaoovnzvvvgpxhczho.supabase.co/storage/v1/object/public';

// Sirve las imágenes desde el propio origen (/img/...): la función [[path]].js
// las proxea con Cache-Control largo, y así el SW y el cache del navegador las
// reutilizan al instante al navegar hacia atrás (Supabase envía 'no-cache').
export function resUrl(u) {
  if (!u || typeof u !== 'string') return '';
  return u.startsWith(SUPABASE_PUBLIC + '/') ? '/img/' + u.slice(SUPABASE_PUBLIC.length + 1) : u;
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
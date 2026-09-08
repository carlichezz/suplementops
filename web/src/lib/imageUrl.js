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
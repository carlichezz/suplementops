// Service Worker: cache del shell + assets + imágenes del mismo origen.
// El SW NO intercepta las imágenes cross-origin (Supabase Storage): en
// Chromium móvil respondWith() de esas respuestas rompe la visualización,
// así que se dejan pasar nativas para que siempre se muestren.
const CACHE_SHELL = 'shell-v2';
const CACHE_IMG = 'images-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
  caches
    .open(CACHE_SHELL)
    .then((c) =>
      c.addAll(['/', '/index.html', '/favicon.svg', '/young-sports-man-training-gym.webp']).catch(() => {})
    )
    .catch(() => {});
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => (k.startsWith('shell-') || k.startsWith('images-')) && k !== CACHE_SHELL && k !== CACHE_IMG)
          .map((k) => caches.delete(k))
      );
      // NOTA: NO usamos clients.claim(). El SW solo controla las navegaciones
      // posteriores; no arrebata la página actual al registrarse.
    })()
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Navegaciones: red primero; si falla (offline), shell cacheado.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_SHELL).then((c) => c.put('/', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/').then((r) => r || fetch(req)))
    );
    return;
  }

  // Imágenes del mismo origen: cache-first con revalidación en segundo plano.
  // Las cross-origin se dejan pasar sin tocar (siempre se muestran).
  if (req.destination === 'image') {
    if (url.origin !== self.location.origin) return;
    e.respondWith(
      caches.match(req).then((hit) => {
        const network = fetch(req)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE_IMG).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => hit);
        return hit || network;
      })
    );
    return;
  }

  // Assets hasheados del build: cache-first con revalidación en segundo plano.
  if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(req).then((hit) => {
        const network = fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_SHELL).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        });
        return hit || network;
      })
    );
    return;
  }
});
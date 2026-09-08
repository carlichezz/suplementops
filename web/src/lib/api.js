const API = '/api/productos';
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_KEYS = {
  productos: 'cache_productos',
  categorias: 'cache_categorias',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readCache(key, allowStale = false) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (!data || (!allowStale && Date.now() - ts > CACHE_TTL)) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // almacenamiento lleno o no disponible; ignoramos
  }
}

function clearCache(...keys) {
  keys.forEach((k) => localStorage.removeItem(k));
}

async function cachedFetch(key, fetcher) {
  const cached = readCache(key);
  if (cached) return cached;
  try {
    const data = await fetcher();
    writeCache(key, data);
    return data;
  } catch (e) {
    const stale = readCache(key, true);
    if (stale) return stale;
    throw e;
  }
}

async function fetchJson(url, opts = {}, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await fetch(url, opts);
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) await sleep(600 * (i + 1));
    }
  }
  throw lastErr;
}

export function adminHeaders(extra = {}) {
  const h = { ...extra };
  const token = localStorage.getItem('admin_token');
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export async function adminSessionValid() {
  if (!localStorage.getItem('admin_token')) return false;
  try {
    const r = await fetch('/api/ordenes', { headers: adminHeaders() });
    if (r.ok) return true;
    if (r.status === 401) {
      localStorage.removeItem('admin_token');
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

export const api = {
  async list() {
    return cachedFetch(CACHE_KEYS.productos, () => fetchJson(API).then((r) => r.json()));
  },
  async get(id) {
    return fetchJson(`${API}/${id}`).then((r) => r.json());
  },
  async create(data) {
    const r = await fetch(API, {
      method: 'POST',
      headers: adminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    clearCache(CACHE_KEYS.productos);
    return r.json();
  },
  async update(id, data) {
    const r = await fetch(`${API}/${id}`, {
      method: 'PUT',
      headers: adminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    clearCache(CACHE_KEYS.productos);
    return r.json();
  },
  async remove(id) {
    const r = await fetch(`${API}/${id}`, {
      method: 'DELETE',
      headers: adminHeaders(),
    });
    clearCache(CACHE_KEYS.productos);
    return r.json();
  },
  variaciones: {
    async save(id, atributos, variaciones) {
      const r = await fetch(`${API}/${id}/variaciones`, {
        method: 'PUT',
        headers: adminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ atributos, variaciones }),
      });
      clearCache(CACHE_KEYS.productos);
      return r.json();
    },
  },
  categorias: {
    async list() {
      return cachedFetch(CACHE_KEYS.categorias, () => fetchJson('/api/categorias').then((r) => r.json()));
    },
    async create(nombre) {
      const r = await fetch('/api/categorias', {
        method: 'POST',
        headers: adminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ nombre }),
      });
      clearCache(CACHE_KEYS.categorias, CACHE_KEYS.productos);
      return r.json();
    },
    async update(id, nombre) {
      const r = await fetch(`/api/categorias/${id}`, {
        method: 'PUT',
        headers: adminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ nombre }),
      });
      clearCache(CACHE_KEYS.categorias, CACHE_KEYS.productos);
      return r.json();
    },
    async remove(id) {
      const r = await fetch(`/api/categorias/${id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });
      clearCache(CACHE_KEYS.categorias, CACHE_KEYS.productos);
      return r.json();
    },
  },
  ordenes: {
    async list(estado, tries = 3) {
      const q = estado ? `?estado=${encodeURIComponent(estado)}` : '';
      return fetchJson(`/api/ordenes${q}`, { headers: adminHeaders() }, tries).then((r) => r.json());
    },
    async get(id) {
      return fetchJson(`/api/ordenes/${id}`, { headers: adminHeaders() }).then((r) => r.json());
    },
    async create(data) {
      return fetch('/api/ordenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json());
    },
    async setEstado(id, estado) {
      return fetch(`/api/ordenes/${id}`, {
        method: 'PUT',
        headers: adminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ estado }),
      }).then((r) => r.json());
    },
    async updateProductos(id, productos) {
      return fetch(`/api/ordenes/${id}`, {
        method: 'PUT',
        headers: adminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ productos }),
      }).then((r) => r.json());
    },
  },
  chatids: {
    async list() {
      return fetchJson('/api/chatids', { headers: adminHeaders() }).then((r) => r.json());
    },
    async create(chat_id, etiqueta) {
      return fetch('/api/chatids', {
        method: 'POST',
        headers: adminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ chat_id, etiqueta }),
      }).then((r) => r.json());
    },
    async remove(id) {
      return fetch(`/api/chatids/${id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      }).then((r) => r.json());
    },
  },
  adminCode() {
    return fetchJson('/api/admin-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).then((r) => r.json());
  },
  adminVerify(codigo) {
    return fetchJson('/api/admin-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo }),
    }).then((r) => r.json());
  },
};

export function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalización no soportada'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}

export function uploadImage() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      document.body.removeChild(input);
      if (!file) return resolve('');
      try {
        const form = new FormData();
        form.append('file', file);
        const r = await fetch('/api/upload', {
          method: 'POST',
          headers: adminHeaders(),
          body: form,
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Error al subir');
        resolve(j.url);
      } catch (e) {
        reject(e);
      }
    });
    input.click();
  });
}

export const ESTADOS_ORDEN = ['pendiente', 'despachada', 'entregada'];

export function estadoLabel(e) {
  return { pendiente: 'Pendiente', despachada: 'Despachada', entregada: 'Entregada' }[e] || e;
}

export function estadoColor(e) {
  return (
    {
      pendiente: 'var(--accent)',
      despachada: '#f5a623',
      entregada: '#28a745',
    }[e] || 'var(--muted)'
  );
}
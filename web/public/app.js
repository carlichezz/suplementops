const API = '/api/productos';

function adminHeaders(extra = {}) {
  const h = { ...extra };
  const token = sessionStorage.getItem('admin_token');
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

const api = {
  async list() {
    return fetch(API).then((r) => r.json());
  },
  async get(id) {
    return fetch(`${API}/${id}`).then((r) => r.json());
  },
  async create(data) {
    return fetch(API, {
      method: 'POST',
      headers: adminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    }).then((r) => r.json());
  },
  async update(id, data) {
    return fetch(`${API}/${id}`, {
      method: 'PUT',
      headers: adminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    }).then((r) => r.json());
  },
  async remove(id) {
    return fetch(`${API}/${id}`, {
      method: 'DELETE',
      headers: adminHeaders(),
    }).then((r) => r.json());
  },
  categorias: {
    async list() {
      return fetch('/api/categorias').then((r) => r.json());
    },
    async create(nombre) {
      return fetch('/api/categorias', {
        method: 'POST',
        headers: adminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ nombre }),
      }).then((r) => r.json());
    },
    async update(id, nombre) {
      return fetch(`/api/categorias/${id}`, {
        method: 'PUT',
        headers: adminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ nombre }),
      }).then((r) => r.json());
    },
    async remove(id) {
      return fetch(`/api/categorias/${id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      }).then((r) => r.json());
    },
  },
  ordenes: {
    async list(estado) {
      const q = estado ? `?estado=${encodeURIComponent(estado)}` : '';
      return fetch(`/api/ordenes${q}`, { headers: adminHeaders() }).then((r) => r.json());
    },
    async get(id) {
      return fetch(`/api/ordenes/${id}`, { headers: adminHeaders() }).then((r) => r.json());
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
  },
  chatids: {
    async list() {
      return fetch('/api/chatids', { headers: adminHeaders() }).then((r) => r.json());
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
    return fetch('/api/admin-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).then((r) => r.json());
  },
  adminVerify(codigo) {
    return fetch('/api/admin-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo }),
    }).then((r) => r.json());
  },
};

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function money(n) {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function priceNum(p) {
  const n = parseFloat(String(p || '').replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

function rankNum(r) {
  const n = parseInt(String(r || '').replace(/[^0-9]/g, ''));
  return isNaN(n) ? 999999 : n;
}

function ratingNum(r) {
  const n = parseFloat(String(r || '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function stockTag(p) {
  const s = p.stock != null ? p.stock : 999;
  if (s <= 0) return '<span class="stock-tag stock-out">● Agotado</span>';
  if (s <= 5) return `<span class="stock-tag stock-low">● Quedan ${s}</span>`;
  return `<span class="stock-tag stock-ok">● En stock (${s})</span>`;
}

function addToCart(id, qty) {
  Cart.add(id, qty);
  openCart();
}

function buyNow(id) {
  Cart.add(id, 1);
  window.location.href = 'checkout.html';
}

function goCheckout() {
  if (Cart.getCount() === 0) {
    toast('Tu carrito está vacío', 'error');
    return;
  }
  window.location.href = 'checkout.html';
}

function openCart() {
  const panel = document.getElementById('cart-panel');
  const overlay = document.getElementById('cart-overlay');
  if (panel) panel.classList.add('open');
  if (overlay) overlay.classList.add('show');
}

function closeCart() {
  const panel = document.getElementById('cart-panel');
  const overlay = document.getElementById('cart-overlay');
  if (panel) panel.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
}

document.addEventListener('click', (e) => {
  if (e.target.closest('#cart-fab')) openCart();
  if (e.target.closest('#cart-close')) closeCart();
  if (e.target.closest('#cart-overlay')) closeCart();
  if (e.target.closest('#cart-checkout')) goCheckout();
});

// Prevenir el pinch-zoom en móvil (complementa user-scalable=no)
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());
document.addEventListener(
  'touchmove',
  (e) => {
    if (e.touches.length > 1) e.preventDefault();
  },
  { passive: false }
);

// ==== Helpers globales (checkout, categorías, órdenes) ====

function getLocation() {
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

function toast(msg, type = 'info') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.className = `toast ${type}`;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2500);
}

const ESTADOS_ORDEN = ['pendiente', 'despachada', 'entregada'];

function estadoLabel(e) {
  return { pendiente: 'Pendiente', despachada: 'Despachada', entregada: 'Entregada' }[e] || e;
}

function estadoColor(e) {
  return {
    pendiente: 'var(--accent)',
    despachada: '#f5a623',
    entregada: '#28a745',
  }[e] || 'var(--muted)';
}

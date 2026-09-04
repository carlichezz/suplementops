const Cart = (() => {
  const KEY = 'carrito_suplementos';
  let items = loadItems();

  // Ruta a una página de producto: se pasa por config
  let productBaseUrl = 'producto.html?id=';

  function loadItems() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch {
      return [];
    }
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(items));
    document.dispatchEvent(new CustomEvent('cartchange'));
    renderBadge();
    renderPanel();
  }

  function emit() {
    document.dispatchEvent(new CustomEvent('cartchange'));
    renderBadge();
    renderPanel();
  }

  function getItems() {
    return items.slice();
  }

  function getCount() {
    return items.reduce((a, i) => a + i.cantidad, 0);
  }

  function getTotal(catalog) {
    return items.reduce((sum, item) => {
      const p = catalog.find((x) => x.id == item.id);
      const price = parseFloat(String(p && p.precio || '').replace(/[^0-9.]/g, ''));
      return sum + (isNaN(price) ? 0 : price * item.cantidad);
    }, 0);
  }

  function add(id, qty = 1) {
    const existing = items.find((i) => i.id == id);
    if (existing) {
      existing.cantidad += qty;
    } else {
      items.push({ id: id, cantidad: qty });
    }
    save();
  }

  function remove(id) {
    items = items.filter((i) => i.id != id);
    save();
  }

  function setQty(id, qty) {
    const item = items.find((i) => i.id == id);
    if (!item) return;
    item.cantidad = Math.max(1, qty);
    save();
  }

  function qtyOf(id) {
    const item = items.find((i) => i.id == id);
    return item ? item.cantidad : 0;
  }

  function clear() {
    items = [];
    save();
  }

  // --- UI ---
  function money(n) {
    return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function renderBadge() {
    const badge = document.getElementById('cart-count');
    if (badge) {
      const c = getCount();
      badge.textContent = c;
      badge.classList.toggle('zero', c === 0);
    }
  }

  // data-catalog: array de productos para resolver títulos/precios/imágenes.
  // Si no se pasa, usa el catálogo guardado en init/refresh.
  function renderPanel(catalog) {
    const panel = document.getElementById('cart-panel');
    const listEl = document.getElementById('cart-items');
    if (!panel || !listEl) return;
    const catalog2 = catalog || window.__catalog || [];
    const items = getItems();
    const total = getTotal(catalog2);

    if (items.length === 0) {
      listEl.innerHTML = '<div class="cart-empty">Tu carrito está vacío.</div>';
      if (document.getElementById('cart-total')) {
        document.getElementById('cart-total').textContent = '';
      }
      if (document.getElementById('cart-checkout')) {
        document.getElementById('cart-checkout').disabled = true;
      }
      return;
    }

    listEl.innerHTML = items.map((item) => {
      const p = catalog2.find((x) => x.id == item.id);
      if (!p) return '';
      const price = parseFloat(String(p.precio || '').replace(/[^0-9.]/g, ''));
      const subtotal = (isNaN(price) ? 0 : price * item.cantidad);
      const stock = p.stock != null ? p.stock : 999;
      const max = Math.min(stock, 99);
      return `
        <div class="cart-item">
          <a class="cart-thumb" href="${productBaseUrl}${p.id}">
            ${p.imagen_url ? `<img src="${esc(p.imagen_url)}" alt="" />` : ''}
          </a>
          <div class="cart-info">
            <a class="cart-name" href="${productBaseUrl}${p.id}">${esc(p.titulo)}</a>
            <div class="cart-price">${esc(p.precio)}</div>
            <div class="cart-qty">
              <button class="qty-btn" data-id="${p.id}" data-act="dec">−</button>
              <span class="qty-num">${item.cantidad}</span>
              <button class="qty-btn" data-id="${p.id}" data-act="inc">+</button>
              <button class="qty-remove" data-id="${p.id}" data-act="del">Eliminar</button>
            </div>
          </div>
          <div class="cart-subtotal">${money(subtotal)}</div>
        </div>`;
    }).join('');

    if (document.getElementById('cart-total')) {
      document.getElementById('cart-total').textContent = money(total);
    }
    if (document.getElementById('cart-checkout')) {
      document.getElementById('cart-checkout').disabled = false;
    }
  }

  function bindCartUI() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.getAttribute('data-act');
      const id = btn.getAttribute('data-id');
      if (act === 'inc') {
        const cur = qtyOf(id);
        const p = window.__catalog && window.__catalog.find((x) => x.id == id);
        const max = p && p.stock != null ? p.stock : 99;
        if (cur < max) setQty(id, cur + 1);
        else flash('← Sin más stock');
      } else if (act === 'dec') {
        setQty(id, qtyOf(id) - 1);
      } else if (act === 'del') {
        remove(id);
      }
    });
  }

  function flash(msg) {
    const al = document.getElementById('alert');
    if (!al) return;
    al.className = 'alert info';
    al.textContent = msg;
    al.classList.remove('hidden');
    clearTimeout(Cart._flashTimer);
    Cart._flashTimer = setTimeout(() => al.classList.add('hidden'), 2000);
  }

  return {
    setProductBase(b) { productBaseUrl = b; },
    add, remove, setQty, getItems, getCount, getTotal, qtyOf, clear,
    init(catalog) {
      window.__catalog = catalog;
      renderBadge();
      renderPanel(catalog);
      bindCartUI();
    },
    refresh(catalog) {
      window.__catalog = catalog;
      renderBadge();
      renderPanel(catalog);
    },
    flash,
  };
})();

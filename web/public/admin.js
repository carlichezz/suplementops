let allProducts = [];
let allCategorias = [];

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b) => {
    b.classList.toggle('active', b.getAttribute('data-tab') === tab);
  });
  document.querySelectorAll('.tab-panel').forEach((p) => {
    p.classList.toggle('active', p.id === 'panel-' + tab);
  });
  if (tab === 'productos') load();
  if (tab === 'categorias') loadCategorias();
  if (tab === 'ordenes') loadOrdenes();
  if (tab === 'notificaciones') loadChatIds();
}

function showAlert(msg, type) {
  const el = document.getElementById('alert');
  el.className = `alert ${type}`;
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(showAlert._t);
  showAlert._t = setTimeout(() => el.classList.add('hidden'), 4000);
}

/* ==================== PRODUCTOS ==================== */

async function load() {
  try {
    const [prods, cats] = await Promise.all([api.list(), api.categorias.list()]);
    allProducts = prods;
    allCategorias = cats;
    render();
  } catch {
    showAlert('No se pudieron cargar los datos.', 'error');
  }
}

function render() {
  const grid = document.getElementById('grid');
  document.getElementById('empty').classList.toggle('hidden', allProducts.length > 0);
  grid.innerHTML = allProducts.map((p) => `
    <div class="admin-list-item">
      <div class="admin-list-thumb">${p.imagen_url ? `<img loading="lazy" src="${esc(p.imagen_url)}" alt="" />` : ''}</div>
      <div class="admin-list-info">
        <div class="admin-list-title">${esc(p.titulo)}</div>
        <div class="admin-list-meta">
          ${p.categoria_nombre ? `<span class="cat-chip">${esc(p.categoria_nombre)}</span>` : ''}
          <span class="admin-list-price">${esc(p.precio)}</span>
          ${stockTag(p)}
        </div>
      </div>
      <div class="admin-list-actions">
        <button class="btn btn-secondary" onclick="openModal(${p.id})">Editar</button>
        <button class="btn btn-danger" onclick="remove(${p.id})">Eliminar</button>
      </div>
    </div>`).join('');
}

function openModal(id) {
  const modal = document.getElementById('modal');
  document.getElementById('form').reset();
  document.getElementById('f-id').value = '';

  populateCategoriaSelect();
  const catSel = document.getElementById('f-categoria');

  if (id) {
    const p = allProducts.find((x) => x.id == id);
    if (!p) return;
    document.getElementById('modal-title').textContent = 'Editar producto';
    document.getElementById('f-id').value = p.id;
    document.getElementById('f-titulo').value = p.titulo || '';
    document.getElementById('f-descripcion').value = p.descripcion || '';
    document.getElementById('f-precio').value = p.precio || '';
    document.getElementById('f-ranking').value = p.ranking || '';
    document.getElementById('f-rating').value = p.rating || '';
    document.getElementById('f-num_reviews').value = p.num_reviews || '';
    document.getElementById('f-num_ofertas').value = p.num_ofertas || '';
    document.getElementById('f-stock').value = p.stock != null ? p.stock : '';
    document.getElementById('f-asin').value = p.asin || '';
    document.getElementById('f-url_producto').value = p.url_producto || '';
    setImgInputs(p);
    if (p.categoria_id) catSel.value = p.categoria_id;
  } else {
    document.getElementById('modal-title').textContent = 'Nuevo producto';
    setImgInputs({ imagen_url: '', imagenes_extra: '' });
  }

  modal.classList.add('open');
}

function populateCategoriaSelect() {
  const sel = document.getElementById('f-categoria');
  sel.innerHTML = '<option value="">Sin categoría</option>' +
    allCategorias.map((c) => `<option value="${c.id}">${esc(c.nombre)}</option>`).join('');
}

function setImgInputs(p) {
  const wrap = document.getElementById('f-imagenes');
  const imgs = [];
  if (p.imagen_url) imgs.push(p.imagen_url);
  if (p.imagenes_extra) {
    String(p.imagenes_extra).split(',').map((s) => s.trim()).filter(Boolean).forEach((u) => imgs.push(u));
  }
  wrap.innerHTML = imgs.length
    ? imgs.map((u) => imgInputRow(u)).join('')
    : imgInputRow('');
}

function imgInputRow(value) {
  return `<div class="img-input-row"><input class="img-link" value="${esc(value || '')}" placeholder="https://..." /><button type="button" class="img-upload" onclick="uploadImgInput(this)">Subir</button><button type="button" class="img-remove" onclick="this.parentElement.remove()">×</button></div>`;
}

function uploadImgInput(btn) {
  const row = btn.closest('.img-input-row');
  const input = row.querySelector('.img-link');
  const hidden = document.createElement('input');
  hidden.type = 'file';
  hidden.accept = 'image/*';
  hidden.style.display = 'none';
  document.body.appendChild(hidden);
  hidden.addEventListener('change', async () => {
    const file = hidden.files && hidden.files[0];
    document.body.removeChild(hidden);
    if (!file) return;
    btn.disabled = true;
    btn.textContent = 'Subiendo...';
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
      input.value = j.url;
    } catch (e) {
      alert('No se pudo subir la imagen: ' + (e.message || e));
    } finally {
      btn.disabled = false;
      btn.textContent = 'Subir';
    }
  });
  hidden.click();
}

function addImgInput() {
  const wrap = document.getElementById('f-imagenes');
  wrap.insertAdjacentHTML('beforeend', imgInputRow(''));
}

function collectImgInputs() {
  const links = Array.from(document.querySelectorAll('#f-imagenes .img-link'))
    .map((i) => i.value.trim())
    .filter(Boolean);
  return {
    imagen_url: links[0] || '',
    imagenes_extra: links.slice(1).join(',') || null,
  };
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

document.querySelectorAll('.modal').forEach((m) => {
  m.addEventListener('click', (e) => {
    if (e.target === m) m.classList.remove('open');
  });
});

document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('f-id').value;
  const data = {
    titulo: document.getElementById('f-titulo').value,
    descripcion: document.getElementById('f-descripcion').value,
    categoria_id: document.getElementById('f-categoria').value || null,
    precio: document.getElementById('f-precio').value,
    ranking: document.getElementById('f-ranking').value,
    rating: document.getElementById('f-rating').value,
    num_reviews: document.getElementById('f-num_reviews').value,
    num_ofertas: document.getElementById('f-num_ofertas').value,
    stock: parseInt(document.getElementById('f-stock').value, 10),
    asin: document.getElementById('f-asin').value,
    url_producto: document.getElementById('f-url_producto').value,
    ...collectImgInputs(),
  };

  let res;
  if (id) res = await api.update(id, data);
  else res = await api.create(data);

  if (res.ok) {
    showAlert('Producto guardado.', 'success');
    closeModal();
    load();
  } else {
    showAlert(res.error || 'Error al guardar.', 'error');
  }
});

async function remove(id) {
  if (!confirm('¿Eliminar este producto?')) return;
  const res = await api.remove(id);
  if (res.ok) {
    showAlert('Producto eliminado.', 'success');
    load();
  } else {
    showAlert('Error al eliminar.', 'error');
  }
}

/* ==================== CATEGORÍAS ==================== */

async function loadCategorias() {
  try {
    allCategorias = await api.categorias.list();
    renderCategorias();
  } catch {
    showAlert('No se pudieron cargar las categorías.', 'error');
  }
}

function renderCategorias() {
  const list = document.getElementById('cat-list');
  document.getElementById('cat-empty').classList.toggle('hidden', allCategorias.length > 0);
  list.innerHTML = allCategorias.map((c) => `
    <div class="cat-row">
      <div>
        <div class="cat-name">${esc(c.nombre)}</div>
        <div class="cat-count">${c.num_productos || 0} producto(s)</div>
      </div>
      <div class="cat-actions">
        <button class="btn btn-secondary" onclick="editCategoria(${c.id})">Editar</button>
        <button class="btn btn-danger" onclick="deleteCategoria(${c.id})">Eliminar</button>
      </div>
    </div>`).join('');
}

function editCategoria(id) {
  const c = allCategorias.find((x) => x.id == id);
  const name = prompt('Renombrar categoría:', c ? c.nombre : '');
  if (name === null) return;
  api.categorias.update(id, name.trim()).then(async (r) => {
    if (r.ok) {
      showAlert('Categoría actualizada.', 'success');
      await loadCategorias();
      await load();
    } else {
      showAlert(r.error || 'Error.', 'error');
    }
  });
}

async function deleteCategoria(id) {
  const c = allCategorias.find((x) => x.id == id);
  if (!confirm(`¿Eliminar la categoría "${c ? c.nombre : ''}"?`)) return;
  const r = await api.categorias.remove(id);
  if (r.ok) {
    showAlert('Categoría eliminada.', 'success');
    await loadCategorias();
    await load();
  } else {
    showAlert(r.error || 'Error.', 'error');
  }
}

document.getElementById('cat-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('cat-input');
  const nombre = input.value.trim();
  if (!nombre) return;
  const r = await api.categorias.create(nombre);
  if (r.ok) {
    showAlert('Categoría creada.', 'success');
    input.value = '';
    await loadCategorias();
    await load();
  } else {
    showAlert(r.error || 'Error.', 'error');
  }
});

/* ==================== ÓRDENES ==================== */

async function loadOrdenes() {
  const estado = document.getElementById('ordenes-filtro').value;
  document.getElementById('ordenes-empty').classList.add('hidden');
  try {
    const ordenes = await api.ordenes.list(estado);
    renderOrdenes(ordenes);
  } catch {
    showAlert('No se pudieron cargar las órdenes.', 'error');
  }
}

function orderActions(o) {
  if (o.estado === 'entregada') {
    return '<span class="od-done">Entregada</span>';
  }
  if (o.estado === 'despachada') {
    return `
      <button class="btn btn-primary" onclick="setEstado(${o.id},'entregada',event)">Entregar</button>
      <button class="btn btn-danger" onclick="setEstado(${o.id},'pendiente',event)">Cancelar despacho</button>`;
  }
  return `
    <button class="btn btn-secondary" onclick="setEstado(${o.id},'despachada',event)">Despachar</button>`;
}

function renderOrdenes(ordenes) {
  const list = document.getElementById('ordenes-list');
  document.getElementById('ordenes-empty').classList.toggle('hidden', ordenes.length > 0);
  list.innerHTML = ordenes.map((o) => {
    let itemsCount = 0;
    try {
      const items = JSON.parse(o.productos || '[]');
      itemsCount = items.reduce((a, i) => a + (Number(i.cantidad) || 0), 0);
    } catch {
      itemsCount = 0;
    }
    return `
      <div class="order-card" onclick="openOrden(${o.id})">
        <div class="order-main">
          <div class="order-title">#${o.id} · ${esc(o.nombre)}</div>
          <div class="order-sub">${itemsCount} producto(s) · ${esc(o.telefono || 'sin teléfono')} · ${esc(o.creado_en || '')}</div>
          <div class="order-attr" style="text-align:left;margin-top:4px">
            <span style="color:${estadoColor(o.estado)};font-weight:700">● ${estadoLabel(o.estado)}</span>
          </div>
        </div>
        <div class="order-attr">
          <div class="order-total">${esc(o.total)}</div>
          <div class="order-actions">
            ${orderActions(o)}
          </div>
        </div>
      </div>`;
  }).join('');
}

async function setEstado(id, estado, ev) {
  if (ev) ev.stopPropagation();
  const r = await api.ordenes.setEstado(id, estado);
  if (r.ok) {
    showAlert(`Orden marcada como ${estadoLabel(estado)}.`, 'success');
    loadOrdenes();
  } else {
    showAlert(r.error || 'Error.', 'error');
  }
}

async function openOrden(id) {
  const o = await api.ordenes.get(id);
  if (!o || o.error) {
    showAlert('No se pudo cargar la orden.', 'error');
    return;
  }
  const items = o.productos || [];
  const itemsHtml = items.map((i) => `
    <div class="od-row">
      ${i.imagen_url ? `<img src="${esc(i.imagen_url)}" alt="" />` : ''}
      <div class="od-info">${esc(i.titulo)} × ${i.cantidad}</div>
      <div class="od-price">${esc(i.precio)}</div>
    </div>`).join('') || '<div class="cart-empty">Sin productos</div>';

  const mapsUrl = o.lat != null && o.lon != null
    ? `https://www.google.com/maps?q=${o.lat},${o.lon}`
    : null;

  document.getElementById('orden-detalle').innerHTML = `
    <div class="field"><label>Cliente</label><div><b>${esc(o.nombre)}</b></div></div>
    <div class="field"><label>Teléfono</label><div>${esc(o.telefono || '—')}${o.telefono_alt ? '<br>' + esc(o.telefono_alt) + ' (alt)' : ''}</div></div>
    <div class="field"><label>Dirección</label><div>${esc(o.direccion || '—')}
      ${mapsUrl ? `<br><span class="od-price">${Number(o.lat).toFixed(5)}, ${Number(o.lon).toFixed(5)}</span>
        <br><a class="btn btn-secondary map-btn" href="${mapsUrl}" target="_blank" rel="noopener"><svg class="btn-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> Ver en Google Maps</a>` : ''}
    </div></div>
    ${o.nota ? `<div class="field"><label>Nota</label><div>${esc(o.nota)}</div></div>` : ''}
    <div class="field"><label>Productos</label><div>${itemsHtml}</div></div>
    <div class="field"><label>Total</label><div class="order-total">${esc(o.total)}</div></div>
    <div class="field"><label>Estado</label>
      <select class="select" onchange="setEstadoModal(${o.id}, this.value)">
        ${ESTADOS_ORDEN.map((e) => `<option value="${e}" ${e === o.estado ? 'selected' : ''}>${estadoLabel(e)}</option>`).join('')}
      </select>
    </div>`;

  document.getElementById('orden-modal').classList.add('open');
}

async function setEstadoModal(id, estado) {
  const r = await api.ordenes.setEstado(id, estado);
  if (r.ok) {
    showAlert(`Orden marcada como ${estadoLabel(estado)}.`, 'success');
    loadOrdenes();
  } else {
    showAlert(r.error || 'Error.', 'error');
  }
}

function closeOrdenModal() {
  document.getElementById('orden-modal').classList.remove('open');
}

/* ==================== NOTIFICACIONES (CHAT IDS) ==================== */

async function loadChatIds() {
  try {
    const ids = await api.chatids.list();
    renderChatIds(ids);
  } catch {
    showAlert('No se pudieron cargar los chat IDs.', 'error');
  }
}

function renderChatIds(ids) {
  const list = document.getElementById('chatid-list');
  document.getElementById('chatid-empty').classList.toggle('hidden', ids.length > 0);
  list.innerHTML = ids.map((c) => `
    <div class="cat-row">
      <div>
        <div class="cat-name">${esc(c.chat_id)}${c.etiqueta ? ' <span style="color:var(--muted);font-weight:400">· ' + esc(c.etiqueta) + '</span>' : ''}</div>
        <div class="cat-count">Añadido: ${esc(c.creado_en || '—')}</div>
      </div>
      <div class="cat-actions">
        <button class="btn btn-danger" onclick="deleteChatId(${c.id})">Eliminar</button>
      </div>
    </div>`).join('');
}

async function deleteChatId(id) {
  const r = await api.chatids.remove(id);
  if (r.ok) {
    showAlert('Chat ID eliminado.', 'success');
    loadChatIds();
  } else {
    showAlert(r.error || 'Error.', 'error');
  }
}

document.getElementById('chatid-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const chat_id = document.getElementById('chatid-input').value.trim();
  const etiqueta = document.getElementById('chatid-label').value.trim();
  if (!chat_id) return;
  const r = await api.chatids.create(chat_id, etiqueta);
  if (r.ok) {
    showAlert('Chat ID añadido.', 'success');
    document.getElementById('chatid-input').value = '';
    document.getElementById('chatid-label').value = '';
    loadChatIds();
  } else {
    showAlert(r.error || 'Error.', 'error');
  }
});

function gate() {
  const token = sessionStorage.getItem('admin_token');
  const loginEl = document.getElementById('admin-login');
  const panelEl = document.getElementById('admin-panel');
  if (token) {
    loginEl.classList.add('hidden');
    panelEl.classList.remove('hidden');
    load();
  } else {
    panelEl.classList.add('hidden');
    loginEl.classList.remove('hidden');
  }
}

document.getElementById('btn-send-code').addEventListener('click', async () => {
  showAlert('Solicitando código al bot...', 'info');
  const r = await api.adminCode();
  if (r.ok) {
    showAlert('Código enviado a tu Telegram.', 'success');
  } else {
    showAlert(r.error || 'Error al enviar el código.', 'error');
  }
});

document.getElementById('btn-verify').addEventListener('click', async () => {
  const codigo = document.getElementById('admin-code-input').value.trim();
  if (!codigo) return showAlert('Ingresa el código recibido.', 'error');
  const r = await api.adminVerify(codigo);
  if (r.ok) {
    sessionStorage.setItem('admin_token', r.token);
    showAlert('Acceso concedido.', 'success');
    gate();
  } else {
    showAlert(r.error || 'Código inválido.', 'error');
  }
});

document.getElementById('admin-code-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('btn-verify').click();
});

gate();
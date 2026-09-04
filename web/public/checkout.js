let catalog = [];
let ubicacion = null;

const DATOS_KEY = 'checkout_datos';

function loadDatos() {
  try {
    return JSON.parse(localStorage.getItem(DATOS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveDatos() {
  const nombre = document.getElementById('f-nombre').value.trim();
  const direccion = document.getElementById('f-direccion').value.trim();
  const telefono = document.getElementById('f-telefono').value.trim();
  const telefono_alt = document.getElementById('f-telefono_alt').value.trim();
  const nota = document.getElementById('f-nota').value.trim();
  localStorage.setItem(DATOS_KEY, JSON.stringify({ nombre, direccion, telefono, telefono_alt, nota }));
}

function prefillDatos() {
  const d = loadDatos();
  if (d.nombre) document.getElementById('f-nombre').value = d.nombre;
  if (d.direccion) document.getElementById('f-direccion').value = d.direccion;
  if (d.telefono) document.getElementById('f-telefono').value = d.telefono;
  if (d.telefono_alt) document.getElementById('f-telefono_alt').value = d.telefono_alt;
  if (d.nota) document.getElementById('f-nota').value = d.nota;
}

async function init() {
  try {
    catalog = await api.list();
  } catch {
    catalog = [];
  }
  Cart.setProductBase('producto.html?id=');
  Cart.init(catalog);

  prefillDatos();

  const items = Cart.getItems();
  if (items.length === 0) {
    document.getElementById('summary').innerHTML = '<div class="cart-empty">Tu carrito está vacío.</div>';
    document.getElementById('total').textContent = '';
  } else {
    renderSummary(items);
  }

  // Registrar SIEMPRE los handlers, sin imports tempranos, para que el
  // submit nunca caiga en el comportamiento nativo (que recarga la página).
  bindLocation();
  bindSubmit();
}

function renderSummary(items) {
  const sum = document.getElementById('summary');
  sum.innerHTML = items
    .map((item) => {
      const p = catalog.find((x) => x.id == item.id);
      if (!p) return '';
      const price = parseFloat(String(p.precio || '').replace(/[^0-9.]/g, ''));
      const subtotal = isNaN(price) ? 0 : price * item.cantidad;
      return `<div class="checkout-line">
        <span class="cl-name">${esc(p.titulo)} × ${item.cantidad}</span>
        <span>${money(subtotal)}</span>
      </div>`;
    })
    .join('');
  document.getElementById('total').textContent = money(getCartTotal(items));
}

function getCartTotal(items) {
  let t = 0;
  items.forEach((item) => {
    const p = catalog.find((x) => x.id == item.id);
    const price = parseFloat(String(p && p.precio || '').replace(/[^0-9.]/g, ''));
    t += (isNaN(price) ? 0 : price * item.cantidad);
  });
  return t;
}

function bindLocation() {
  const btn = document.getElementById('btn-ubicacion');
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const info = document.getElementById('loc-info');
    try {
      const pos = await getLocation();
      ubicacion = pos;
      info.className = 'loc-info ok';
      info.innerHTML = `<svg class="loc-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> Ubicación obtenida: ${pos.lat.toFixed(5)}, ${pos.lon.toFixed(5)} &nbsp;·&nbsp; <a href="https://www.google.com/maps?q=${pos.lat},${pos.lon}" target="_blank" rel="noopener">Ver en Google Maps</a>`;
      btn.innerHTML = '<svg class="btn-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg> Ubicación compartida';
    } catch (e) {
      info.className = 'loc-info err';
      info.textContent = 'No se pudo obtener la ubicación. Confirma solo con la dirección.';
      btn.innerHTML = '<svg class="btn-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> Reintentar ubicación';
    } finally {
      btn.disabled = false;
    }
  });
}

function setBtn(text, disabled) {
  const btn = document.getElementById('btn-submit');
  btn.disabled = disabled;
  btn.textContent = text;
}

function bindSubmit() {
  const form = document.getElementById('checkout-form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const nombre = document.getElementById('f-nombre').value.trim();
    const direccion = document.getElementById('f-direccion').value.trim();
    const telefono = document.getElementById('f-telefono').value.trim();
    const telefono_alt = document.getElementById('f-telefono_alt').value.trim();
    const nota = document.getElementById('f-nota').value.trim();

    if (!nombre || !direccion || !telefono) {
      toast('Completa nombre, dirección y teléfono', 'error');
      return;
    }

    const items = Cart.getItems();
    if (items.length === 0) {
      toast('Tu carrito está vacío. Añade productos primero.', 'error');
      return;
    }

    // Guardar datos de contacto para la próxima compra
    saveDatos();

    const productos = items
      .map((item) => {
        const p = catalog.find((x) => x.id == item.id);
        return p
          ? { id: p.id, titulo: p.titulo, precio: p.precio, cantidad: item.cantidad, imagen_url: p.imagen_url }
          : null;
      })
      .filter(Boolean);

    setBtn('Enviando...', true);

    try {
      const res = await api.ordenes.create({
        nombre,
        direccion,
        lat: ubicacion ? ubicacion.lat : null,
        lon: ubicacion ? ubicacion.lon : null,
        telefono,
        telefono_alt,
        nota,
        productos,
        total: money(getCartTotal(items)),
      });

      if (res && res.ok) {
        Cart.clear();
        form.innerHTML = `
          <div style="text-align:center;padding:30px 0">
            <div style="font-size:3rem"><svg class="success-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg></div>
            <h2 style="margin:10px 0">¡Orden #${res.id} creada!</h2>
            <p style="color:var(--muted)">Te contactaremos al ${esc(telefono)} para confirmar la entrega.</p>
            <div style="margin-top:20px">
              <a class="btn btn-primary" href="index.html">Volver al catálogo</a>
            </div>
          </div>`;
      } else {
        toast((res && res.error) || 'Error al crear la orden', 'error');
        setBtn('Confirmar y enviar orden', false);
      }
    } catch (err) {
      toast('Error de conexión. Intenta de nuevo.', 'error');
      setBtn('Confirmar y enviar orden', false);
    }
  });
}

init();
let all = [];
let current = null;

async function load() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');

  if (!id) {
    document.getElementById('detail').innerHTML =
      '<div class="empty">Producto no especificado.</div>';
    return;
  }

  try {
    all = await api.list();
    Cart.setProductBase('producto.html?id=');
    Cart.init(all);
    current = all.find((p) => p.id == id);

    if (!current) {
      document.getElementById('detail').innerHTML =
        '<div class="empty">Producto no encontrado.</div>';
      return;
    }
    renderDetail();
    renderRelated();
  } catch (e) {
    document.getElementById('detail').innerHTML =
      '<div class="empty">No se pudieron cargar los datos.</div>';
  }
}

function renderDetail() {
  const p = current;
  const imgs = galleryImages(p);
  const soldOut = p.stock != null && p.stock <= 0;

  const galleryHtml = imgs.length === 0
    ? '<div class="empty">Sin imagen</div>'
    : galleryHTML(imgs);

  document.getElementById('detail').innerHTML = `
    <div class="breadcrumb"><a href="index.html">← Volver al catálogo</a></div>
    <div class="product-main">
      <div class="product-gallery">${galleryHtml}</div>
      <div class="product-info">
        ${p.ranking ? `<span class="badge" style="position:static">${esc(p.ranking)}</span>` : ''}
        <h1>${esc(p.titulo)}</h1>
        <div class="product-price">${esc(p.precio)}</div>
        <div class="product-meta">
          ${p.categoria_nombre ? `<span class="cat-chip">${esc(p.categoria_nombre)}</span>` : ''}
          ${p.rating ? `<span class="stars"><svg class="star-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> <b>${esc(p.rating.replace(' out of 5 stars',''))}</b></span>` : ''}
        </div>
        ${stockTag(p)}
        ${p.descripcion && p.descripcion !== p.titulo ? `<div class="product-desc">${esc(p.descripcion)}</div>` : ''}
        <div class="product-options">
          <button class="btn btn-add" ${soldOut ? 'disabled' : ''} onclick="addToCart(${p.id},1)">${soldOut ? 'Agotado' : 'Agregar al carrito'}</button>
          <button class="btn btn-buy" ${soldOut ? 'disabled' : ''} onclick="buyNow(${p.id})">Comprar ya</button>
        </div>
      </div>
    </div>
  `;
}

function galleryImages(p) {
  const imgs = [];
  if (p.imagen_url) imgs.push(p.imagen_url);
  if (p.imagenes_extra) {
    String(p.imagenes_extra)
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean)
      .forEach((u) => imgs.push(u));
  }
  return imgs;
}

function galleryHTML(imgs) {
  const thumbs = imgs
    .map((u, i) => `<img class="thumb ${i === 0 ? 'active' : ''}" src="${esc(u)}" alt="" data-i="${i}" />`)
    .join('');
  return `
    <div class="img-wrap">${imgs.map((u, i) => `<img class="main-img ${i === 0 ? 'active' : ''}" src="${esc(u)}" alt="" data-i="${i}" />`).join('')}</div>
    ${imgs.length > 1 ? `<div class="thumbs">${thumbs}</div>` : ''}
  `;
}

function renderRelated() {
  const related = findRelated(current, all, 4);
  const grid = document.getElementById('related-grid');

  if (related.length === 0) {
    document.getElementById('related').classList.add('hidden');
    return;
  }
  grid.innerHTML = related.map(relatedCard).join('');
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function findRelated(product, all, n) {
  const words = new Set(tokenize(product.titulo));
  const scored = all
    .filter((p) => p.id != product.id)
    .map((p) => {
      const pwords = tokenize(p.titulo);
      const overlap = pwords.filter((w) => words.has(w)).length;
      const bigrams = pwords.filter((w) => words.size > 0 && [...words].some((x) => x.length > 3 && w.includes(x))).length;
      return { p, score: overlap + bigrams };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, n).map((x) => x.p);
}

function relatedCard(p) {
  const img = p.imagen_url
    ? `<img loading="lazy" src="${esc(p.imagen_url)}" alt="${esc(p.titulo)}" />`
    : '';
  return `
    <div class="card">
      <a class="img-wrap" self style="position:relative" href="producto.html?id=${p.id}">
        ${p.ranking ? `<span class="badge">${esc(p.ranking)}</span>` : ''}
        ${img}
      </a>
      <div class="body">
        <h3><a href="producto.html?id=${p.id}" style="color:inherit;text-decoration:none">${esc(p.titulo)}</a></h3>
        <div class="price">${esc(p.precio)}</div>
        ${stockTag(p)}
        <div class="actions">
          <button class="btn btn-add" onclick="addToCart(${p.id},1)">Agregar</button>
          <button class="btn btn-buy" onclick="buyNow(${p.id})">Comprar</button>
        </div>
      </div>
    </div>`;
}

document.addEventListener('cartchange', () => Cart.refresh(all));

document.addEventListener('click', (e) => {
  const thumb = e.target.closest('.thumb');
  if (!thumb) return;
  const i = thumb.getAttribute('data-i');
  document.querySelectorAll('.thumb').forEach((t) => t.classList.toggle('active', t === thumb));
  document.querySelectorAll('.main-img').forEach((m) => m.classList.toggle('active', m.getAttribute('data-i') === i));
});

load();

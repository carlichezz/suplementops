/* Traducciones e idioma del catálogo */
const I18N = {
  es: {
    'page.title': 'Catálogo de Suplementos',
    'search.ph': 'Buscar producto, marca...',
    'cats.all': 'Todas',
    'sort.title': 'Ordenar por',
    'sort.ranking': 'Ranking',
    'sort.price-asc': 'Precio: menor a mayor',
    'sort.price-desc': 'Precio: mayor a menor',
    'sort.name': 'Nombre A-Z',
    'sort.rating': 'Mejor valoración',
    'count.products': 'producto(s)',
    'no.products': 'No se encontraron productos.',
    'add.cart': 'Agregar al carrito',
    'buy.now': 'Comprar ya',
    'sold.out': 'Agotado',
    'related': 'Productos relacionados',
    'cart.title': 'Tu carrito',
    'cart.total': 'Total',
    'cart.buy': 'Comprar',
    'product.price': 'Precio',
  },
  en: {
    'page.title': 'Supplements Catalog',
    'search.ph': 'Search product, brand...',
    'cats.all': 'All',
    'sort.title': 'Sort by',
    'sort.ranking': 'Ranking',
    'sort.price-asc': 'Price: low to high',
    'sort.price-desc': 'Price: high to low',
    'sort.name': 'Name A-Z',
    'sort.rating': 'Best rated',
    'count.products': 'product(s)',
    'no.products': 'No products found.',
    'add.cart': 'Add to cart',
    'buy.now': 'Buy now',
    'sold.out': 'Sold out',
    'related': 'Related products',
    'cart.title': 'Your cart',
    'cart.total': 'Total',
    'cart.buy': 'Buy',
    'product.price': 'Price',
  },
};

let LANG = 'es';

function detectLang() {
  const saved = localStorage.getItem('lang');
  if (saved && I18N[saved]) return saved;
  const nav = (navigator.language || navigator.languages?.[0] || 'es').toLowerCase();
  return nav.startsWith('en') ? 'en' : 'es';
}

function t(key) {
  const dict = I18N[LANG] || I18N.es;
  return dict[key] !== undefined ? dict[key] : (I18N.es[key] !== undefined ? I18N.es[key] : key);
}

function setLang(lang) {
  if (!I18N[lang]) return;
  LANG = lang;
  localStorage.setItem('lang', lang);
  document.documentElement.lang = lang;
  syncLangButton();
  document.dispatchEvent(new CustomEvent('langchange'));
}

function toggleLang() {
  setLang(LANG === 'es' ? 'en' : 'es');
}

function syncLangButton() {
  const btns = document.querySelectorAll('[data-lang-btn]');
  btns.forEach((b) => (b.textContent = LANG === 'es' ? 'EN' : 'ES'));
}

function initI18n() {
  LANG = detectLang();
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-lang-btn]').forEach((b) => {
    if (!b.dataset.bound) {
      b.dataset.bound = '1';
      b.addEventListener('click', toggleLang);
    }
  });
  syncLangButton();
}
# Catálogo de Suplementos Deportivos · Cloudflare Pages + D1

Catálogo web responsive de suplementos de nutrición deportiva (scrapeado de Amazon).
Frontend + API en el mismo proyecto, desplegado gratis en **Cloudflare Pages**, con los datos en **Cloudflare D1** (SQLite en la nube) y panel de edición accesible desde el navegador.

## Estructura

```
web/
├── functions/               # API (Pages Functions)
│   └── api/                 # productos, categorias, ordenes, chatids, admin
├── index.html               # Única entrada HTML (SPA con React Router)
├── src/
│   ├── App.jsx              # Router (/, /product/:id, /checkout, /admin)
│   ├── entries/main.jsx     # Punto de entrada (mount de la app)
│   ├── pages/               # CatalogPage, ProductPage, CheckoutPage, AdminPage
│   ├── components/
│   ├── lib/                 # api, cart, i18n, format
│   └── css/
├── static/                  # Assets estáticos + _redirects (SPA fallback)
├── migrations/
│   └── 0001_init.sql        # Schema + productos
├── wrangler.jsonc           # Config del proyecto
└── package.json
```

## Requisitos

- Cuenta de Cloudflare (plan gratuito)
- Node.js 18+ 
- `wrangler` (se instala con el proyecto)

## Despliegue

### 1. Instalar dependencias

```bash
cd web
npm install
```

### 2. Crear la base de datos D1

```bash
npx wrangler login
npx wrangler d1 create catalogo-db
```

Toma nota del **database_id** que devuelve el comando y pégalo en `wrangler.jsonc`
(sustituye `REEMPLAZAR-CON-DATABASE_ID`).

### 3. Aplicar la migración (crea la tabla y mete los 30 productos)

```bash
npx wrangler d1 migrations apply catalogo-db --remote
```

### 4. Desplegar a Cloudflare Pages

```bash
npx wrangler pages deploy ./dist
```

Te devolverá una URL `https://<nombre>.pages.dev`. ¡Listo!

## Uso local

```bash
npm run dev
```

La primera vez crea el D1 local automáticamente; aplica la migración local con:

```bash
npm run db:migrate:local
```

## Re-importar datos tras re-scrapear

Si vuelves a scrapear Amazon y cambia `productos.db`:

```bash
cd ..   # raíz del proyecto
python3 export_to_d1.py     # regenera web/migrations/0001_init.sql
cd web
npx wrangler d1 migrations apply catalogo-db --remote
```

> Nota: `0001_init.sql` hace `DELETE FROM productos` antes de insertar, así que al
> re-aplicarlo reemplaza todo el catálogo.

## Editar el catálogo

- **Desde el navegador**: abre `/admin` en tu sitio desplegado. Añadir, editar y eliminar productos (se guarda en D1, persistente).
- El catálogo público (`/`) muestra el listado con búsqueda, ordenación y es totalmente responsive.
- Ficha de producto en `/product/:id` y checkout en `/checkout`.

## Notas

- Las imágenes se sirven directamente desde los CDN de Amazon (`imagen_url`), sin necesidad de almacenamiento adicional (R2).
- El plan gratuito de Cloudflare incluye Pages y una base D1 suficiente para este catálogo.

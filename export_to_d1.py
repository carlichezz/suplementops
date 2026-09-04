import os
import re
import sqlite3

SRC_DB = 'productos.db'
OUT_SQL = 'web/migrations/0001_init.sql'

SCHEMA = '''
CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asin TEXT UNIQUE,
    ranking TEXT,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    precio TEXT,
    rating TEXT,
    num_reviews TEXT,
    num_ofertas TEXT,
    url_producto TEXT,
    imagen_url TEXT,
    imagen_alt TEXT,
    ruta_imagen TEXT,
    scrapeado_en TEXT,
    stock INTEGER DEFAULT 10
);
'''


def clean_row(d):
    for k, v in d.items():
        if v is None:
            d[k] = 'NULL'
        else:
            v = str(v)
            v = v.replace("'", "''")
            d[k] = f"'{v}'"
    return d


def main():
    conn = sqlite3.connect(SRC_DB)
    conn.row_factory = sqlite3.Row
    rows = conn.execute('SELECT * FROM productos ORDER BY id').fetchall()

    lines = []
    lines.append('-- Migración inicial: catálogo de suplementos deportivos')
    lines.append(SCHEMA)
    lines.append('DELETE FROM productos;')

    cols = ['asin', 'ranking', 'titulo', 'descripcion', 'precio', 'rating',
            'num_reviews', 'num_ofertas', 'url_producto', 'imagen_url',
            'imagen_alt', 'ruta_imagen', 'scrapeado_en', 'stock']

    for r in rows:
        d = {c: r[c] for c in cols}
        if d['stock'] is None:
            d['stock'] = 10
        d = clean_row(d)
        values = ', '.join(d[c] for c in cols)
        names = ', '.join(cols)
        lines.append(f"INSERT INTO productos ({names}) VALUES ({values});")

    os.makedirs(os.path.dirname(OUT_SQL), exist_ok=True)
    with open(OUT_SQL, 'w') as f:
        f.write('\n'.join(lines) + '\n')

    print(f'Exportados {len(rows)} productos a {OUT_SQL}')


if __name__ == '__main__':
    main()

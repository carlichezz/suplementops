import os
import re
import sqlite3
import time
import requests
import bs4

URL = 'https://www.amazon.com/gp/bestsellers/hpc/6973663011'
DB_PATH = 'productos.db'
IMAGES_DIR = os.path.join('data', 'imagenes')

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
}


def fetch_page():
    r = requests.get(URL, headers=HEADERS, timeout=30)
    r.raise_for_status()
    return r.text


def extract_items(html):
    soup = bs4.BeautifulSoup(html, 'html.parser')
    items = []
    cells = soup.select('#gridItemRoot')
    for idx, cell in enumerate(cells, start=1):
        item = {}

        badge = cell.select_one('.zg-bdg-text')
        item['ranking'] = badge.get_text(strip=True) if badge else f'#{idx}'

        asin_div = cell.select_one('div[id].p13n-sc-uncoverable-faceout')
        asin = asin_div.get('id') if asin_div else None
        if not asin:
            m = re.search(r'/dp/([A-Z0-9]{10})', (cell.select_one('a[href*=dp]') or {}).get('href', '') if cell.select_one('a[href*=dp]') else '')
            asin = m.group(1) if m else None
        item['asin'] = asin

        title_el = cell.select_one('[class*="p13n-sc-css-line-clamp"]') or cell.select_one('a.a-link-normal.aok-block') or cell.select_one('div[id*=title]')
        item['titulo'] = title_el.get_text(strip=True) if title_el else None

        img = cell.select_one('img')
        item['imagen_url'] = img.get('src') if img else None
        item['imagen_alt'] = img.get('alt') if img else None

        price_el = cell.select_one('.p13n-sc-price')
        item['precio'] = price_el.get_text(strip=True) if price_el else None

        rating_el = cell.select_one('.a-icon-alt')
        item['rating'] = rating_el.get_text(strip=True) if rating_el else None

        reviews_el = cell.select_one('.a-size-small')
        item['num_reviews'] = reviews_el.get_text(strip=True) if reviews_el else None

        offers_el = cell.select_one('.a-color-secondary')
        m = re.search(r'([\d,]+)\s+offers?\s+from', offers_el.get_text(' ', strip=True)) if offers_el else None
        item['num_ofertas'] = m.group(1) if m else None

        link = cell.select_one('a[href*=dp]')
        item['url_producto'] = ('https://www.amazon.com' + link.get('href').split('?')[0]) if link and link.get('href') else None

        items.append(item)
    return items


def download_image(url, asin, index):
    if not url:
        return None
    try:
        r = requests.get(url, headers=HEADERS, timeout=30)
        r.raise_for_status()
        ext_map = {'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif'}
        ext = ext_map.get(r.headers.get('Content-Type', '').split(';')[0].strip(), 'jpg')
        fname = f"{asin or index}.{ext}"
        path = os.path.join(IMAGES_DIR, fname)
        with open(path, 'wb') as f:
            f.write(r.content)
        return path
    except Exception as e:
        print(f'  [error img] {url}: {e}')
        return None


def init_db(conn):
    conn.execute('''
        CREATE TABLE IF NOT EXISTS productos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asin TEXT UNIQUE,
            ranking TEXT,
            titulo TEXT,
            descripcion TEXT,
            precio TEXT,
            rating TEXT,
            num_reviews TEXT,
            num_ofertas TEXT,
            url_producto TEXT,
            imagen_url TEXT,
            imagen_alt TEXT,
            ruta_imagen TEXT,
            scrapeado_en TEXT DEFAULT (datetime('now'))
        )
    ''')
    conn.commit()


def main():
    os.makedirs(IMAGES_DIR, exist_ok=True)
    print('Obteniendo página...')
    html = fetch_page()
    items = extract_items(html)
    print(f'Productos encontrados: {len(items)}')

    conn = sqlite3.connect(DB_PATH)
    init_db(conn)

    for i, item in enumerate(items, start=1):
        print(f'[{i}/{len(items)}] {item["titulo"]}')
        ruta = download_image(item['imagen_url'], item['asin'], i)
        item['ruta_imagen'] = ruta
        item['descripcion'] = item['titulo']
        conn.execute('''
            INSERT OR REPLACE INTO productos
            (asin, ranking, titulo, descripcion, precio, rating, num_reviews,
             num_ofertas, url_producto, imagen_url, imagen_alt, ruta_imagen)
            VALUES (:asin, :ranking, :titulo, :descripcion, :precio, :rating,
             :num_reviews, :num_ofertas, :url_producto, :imagen_url, :imagen_alt, :ruta_imagen)
        ''', {k: item.get(k) for k in
              ['asin', 'ranking', 'titulo', 'descripcion', 'precio', 'rating',
               'num_reviews', 'num_ofertas', 'url_producto', 'imagen_url', 'imagen_alt', 'ruta_imagen']})
        conn.commit()
        time.sleep(0.5)

    conn.commit()
    conn.close()
    print('Listo. Base de datos:', DB_PATH)


if __name__ == '__main__':
    main()

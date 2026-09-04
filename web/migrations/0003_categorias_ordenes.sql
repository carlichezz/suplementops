-- Migración 0003: categorías y órdenes

CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    slug TEXT
);

INSERT OR IGNORE INTO categorias (id, nombre, slug) VALUES
    (1, 'Proteínas en Polvo', 'proteinas'),
    (2, 'Creatina', 'creatina'),
    (3, 'Hidratación & Electrolitos', 'hidratacion'),
    (4, 'Snacks Proteicos', 'snacks'),
    (5, 'Vitaminas & Accesorios', 'vitaminas');

ALTER TABLE productos ADD COLUMN categoria_id INTEGER;

CREATE TABLE IF NOT EXISTS ordenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    direccion TEXT,
    lat REAL,
    lon REAL,
    telefono TEXT,
    telefono_alt TEXT,
    nota TEXT,
    productos TEXT NOT NULL,
    total TEXT,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    creado_en TEXT DEFAULT (datetime('now'))
);
UPDATE productos SET categoria_id=3 WHERE id=1;
UPDATE productos SET categoria_id=5 WHERE id=2;
UPDATE productos SET categoria_id=2 WHERE id=3;
UPDATE productos SET categoria_id=4 WHERE id=4;
UPDATE productos SET categoria_id=1 WHERE id=5;
UPDATE productos SET categoria_id=3 WHERE id=6;
UPDATE productos SET categoria_id=5 WHERE id=7;
UPDATE productos SET categoria_id=2 WHERE id=8;
UPDATE productos SET categoria_id=4 WHERE id=9;
UPDATE productos SET categoria_id=1 WHERE id=10;
UPDATE productos SET categoria_id=3 WHERE id=11;
UPDATE productos SET categoria_id=5 WHERE id=12;
UPDATE productos SET categoria_id=2 WHERE id=13;
UPDATE productos SET categoria_id=4 WHERE id=14;
UPDATE productos SET categoria_id=1 WHERE id=15;
UPDATE productos SET categoria_id=3 WHERE id=16;
UPDATE productos SET categoria_id=5 WHERE id=17;
UPDATE productos SET categoria_id=2 WHERE id=18;
UPDATE productos SET categoria_id=4 WHERE id=19;
UPDATE productos SET categoria_id=1 WHERE id=20;
UPDATE productos SET categoria_id=3 WHERE id=21;
UPDATE productos SET categoria_id=5 WHERE id=22;
UPDATE productos SET categoria_id=2 WHERE id=23;
UPDATE productos SET categoria_id=4 WHERE id=24;
UPDATE productos SET categoria_id=1 WHERE id=25;
UPDATE productos SET categoria_id=3 WHERE id=26;
UPDATE productos SET categoria_id=5 WHERE id=27;
UPDATE productos SET categoria_id=2 WHERE id=28;
UPDATE productos SET categoria_id=4 WHERE id=29;
UPDATE productos SET categoria_id=1 WHERE id=30; 

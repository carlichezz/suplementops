-- Migración 0011: variaciones de producto (atributos + combinaciones con precio/stock propio)

-- Grupos de atributos del producto, ej: [{"nombre":"Sabor","opciones":["Sandía","Limonada"]},...]
ALTER TABLE productos ADD COLUMN atributos TEXT;

CREATE TABLE IF NOT EXISTS variaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    atributos TEXT NOT NULL,
    precio TEXT,
    stock INTEGER,
    pos INTEGER DEFAULT 0,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_variaciones_producto ON variaciones(producto_id);
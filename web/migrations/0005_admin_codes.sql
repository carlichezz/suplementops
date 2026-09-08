-- Migración 0005: códigos de acceso al panel de administración
CREATE TABLE IF NOT EXISTS admin_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL,
    usado INTEGER DEFAULT 0,
    expiracion TEXT,
    creado_en TEXT DEFAULT (datetime('now'))
);
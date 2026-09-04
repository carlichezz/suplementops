-- Migración 0007: sesiones de administrador (tokens emitidos al verificar código)
CREATE TABLE IF NOT EXISTS admin_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    creado_en TEXT DEFAULT (datetime('now')),
    expira_en TEXT NOT NULL
);

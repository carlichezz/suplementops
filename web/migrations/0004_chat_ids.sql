-- Migración 0004: chat IDs editables para notificaciones de Telegram
CREATE TABLE IF NOT EXISTS chat_ids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL UNIQUE,
    etiqueta TEXT,
    creado_en TEXT DEFAULT (datetime('now'))
);
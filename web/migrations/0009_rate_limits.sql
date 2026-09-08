-- Migración 0009: rate limiting por IP
CREATE TABLE IF NOT EXISTS rate_limits (
    clave TEXT PRIMARY KEY,
    conteo INTEGER DEFAULT 0,
    inicio INTEGER NOT NULL
);
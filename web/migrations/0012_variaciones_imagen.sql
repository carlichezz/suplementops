-- Migración 0012: imagen opcional por variación
ALTER TABLE variaciones ADD COLUMN imagen TEXT;
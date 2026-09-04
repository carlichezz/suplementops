-- Añadir columna stock (cantidad en existencia) a productos
ALTER TABLE productos ADD COLUMN stock INTEGER DEFAULT 10;

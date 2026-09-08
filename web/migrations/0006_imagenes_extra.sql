-- Migración 0006: soporte para múltiples imágenes por producto.
-- Añade imagenes_extra (URLs adicionales separadas por coma) manteniendo
-- imagen_url como la imagen principal.
ALTER TABLE productos ADD COLUMN imagenes_extra TEXT;
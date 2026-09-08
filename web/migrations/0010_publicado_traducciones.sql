-- Migración 0010: campo publicado (mostrar/ocultar en la página principal) + traducción a español de productos publicados

ALTER TABLE productos ADD COLUMN publicado INTEGER NOT NULL DEFAULT 1;

UPDATE productos SET titulo = 'Gomitas de Creatina - Apoyo Diario de Creatina | DINAMIKSPORTS' WHERE asin IS NULL AND titulo = 'Creatine Gummies - Daily Creatine Support | DINAMIKSPORTS';
UPDATE productos SET titulo = 'Creatina Monohidratada - DINAMIK SPORTS' WHERE asin IS NULL AND titulo = 'Creatine Monohydrate - DINAMIK SPORTS';
UPDATE productos SET titulo = 'DK500 - Control de Peso - 90 Cápsulas' WHERE asin IS NULL AND titulo = 'DK500 - Weight Management - 90 Capsules';
UPDATE productos SET titulo = 'Muñequeras - Soporte Profesional de Muñeca con Bucle de Pulgar de Alta Resistencia' WHERE asin IS NULL AND titulo = 'Muñequeras - Professional Quality Wrist Support with Heavy Duty Thumb Loop';
UPDATE productos SET descripcion = 'Protección de primera calidad para tus entrenamientos. Máximo soporte de muñeca, comodidad y estabilidad, banda elástica con bucle de pulgar de alta resistencia. Perfectas para levantamiento de pesas, entrenamiento en gimnasio y CrossFit.' WHERE asin IS NULL AND titulo = 'Muñequeras - Soporte Profesional de Muñeca con Bucle de Pulgar de Alta Resistencia';
UPDATE productos SET titulo = 'Soporte Inmune' WHERE asin IS NULL AND titulo = 'Inmune Support';
UPDATE productos SET titulo = 'Proteína Whey - 2,30 lb' WHERE asin IS NULL AND titulo = 'Whey Protein -2,30 lb';
UPDATE productos SET titulo = 'T10 - Potenciador de Testosterona' WHERE asin IS NULL AND titulo = 'T10 - Testosterona Booster ';
UPDATE productos SET titulo = 'Proteína Whey - Bolsa 1,30 lb, 16 servicios, 24 g de proteína' WHERE asin IS NULL AND titulo = 'Whey Protein - Bolsa 1,30 lb, 16 servicios, 24g de proteina';
UPDATE productos SET titulo = 'DEKAFORCE Preentreno', descripcion = 'Sabor: Sandía limonada' WHERE asin IS NULL AND titulo = 'DEKAFORCE PRE ENTRENO ';
UPDATE productos SET titulo = 'Creatina Monohidratada - 400g - 80 servicios' WHERE asin IS NULL AND titulo = 'Creatina Monohidratada -400g - 80 servicios';
UPDATE productos SET titulo = 'Creatina Monohidratada - 500g - 100 servicios' WHERE asin IS NULL AND titulo = 'Creatina Monohidratada -500g - 100 servicios ';
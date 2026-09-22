-- ==============================================================================
-- MIGRACIÓN: AISLAMIENTO DE MATERIALES Y GRABACIONES POR EDICIÓN
-- ==============================================================================

-- 1. Añadir columna edition_id a la tabla materials si no existe
-- Si edition_id IS NULL: El material es general (visible para todas las ediciones).
-- Si edition_id está configurado: Solo es visible para los alumnos de esa edición específica.
ALTER TABLE iavolution.materials
ADD COLUMN IF NOT EXISTS edition_id UUID REFERENCES iavolution.course_editions(id) ON DELETE CASCADE DEFAULT NULL;

-- 2. Crear índice para optimizar consultas de filtrado
CREATE INDEX IF NOT EXISTS idx_materials_edition_id ON iavolution.materials(edition_id);

-- 3. Asignar los 33 materiales existentes del módulo General (Presentación, Calendario de Abril y las 30 grabaciones)
-- a la edición de "Abril 2026" (ID: 1532cb74-b3f8-4ed2-ad88-54032556151f)
-- Lección ID: 0f5ff906-c592-4934-8ef6-1d9c186a04f0
UPDATE iavolution.materials
SET edition_id = '1532cb74-b3f8-4ed2-ad88-54032556151f'
WHERE lesson_id = '0f5ff906-c592-4934-8ef6-1d9c186a04f0';

-- 4. Asegurar permisos para authenticated y anon
GRANT SELECT, INSERT, UPDATE, DELETE ON iavolution.materials TO authenticated;
GRANT SELECT ON iavolution.materials TO anon;

-- 5. Recargar la caché de PostgREST
NOTIFY pgrst, 'reload schema';

-- 6. Consulta de comprobación:
SELECT 
    m.id, 
    m.title, 
    m.type, 
    m.edition_id, 
    ce.name as edition_name
FROM iavolution.materials m
LEFT JOIN iavolution.course_editions ce ON ce.id = m.edition_id
WHERE m.lesson_id = '0f5ff906-c592-4934-8ef6-1d9c186a04f0';

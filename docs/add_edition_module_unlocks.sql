-- ==============================================================================
-- MIGRACIÓN: APERTURA MANUAL PROGRESIVA DE MÓDULOS POR EDICIÓN
-- ==============================================================================

-- 1. Añadir columnas a course_editions si no existen
-- unlocked_modules: array de UUIDs de módulos abiertos. Si es NULL, todos están abiertos (retrocompatibilidad).
-- unlock_project: si el proyecto final está desbloqueado para esta edición.
ALTER TABLE iavolution.course_editions
ADD COLUMN IF NOT EXISTS unlocked_modules UUID[] DEFAULT NULL;

ALTER TABLE iavolution.course_editions
ADD COLUMN IF NOT EXISTS unlock_project BOOLEAN DEFAULT FALSE;

-- 2. Asegurar permisos de lectura y escritura para usuarios autenticados
GRANT SELECT, INSERT, UPDATE, DELETE ON iavolution.course_editions TO authenticated;
GRANT SELECT ON iavolution.course_editions TO anon;

-- 3. Recargar la caché de PostgREST
NOTIFY pgrst, 'reload schema';

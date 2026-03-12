-- ==============================================================================
-- MIGRACIÓN: AÑADIR URL PARA CLASE EN VIVO
-- Ejecutar en el SQL Editor de Supabase
-- ==============================================================================

-- Añadir columna para URL externa a las ediciones del curso
ALTER TABLE iavolution.course_editions
ADD COLUMN IF NOT EXISTS live_class_url TEXT;

-- Forzar refresco de caché en PostgREST
NOTIFY pgrst, 'reload schema';

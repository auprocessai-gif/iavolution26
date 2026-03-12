-- =========================================================
-- Añadir columna 'file_url' a assignments para adjuntos
-- Ejecutar este script en el SQL Editor de Supabase/pgAdmin
-- =========================================================

ALTER TABLE iavolution.assignments ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Recargar caché de PostgREST
NOTIFY pgrst, 'reload schema';

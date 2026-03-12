-- =========================================================
-- Añadir columna 'points' a quiz_questions (falta en el esquema original)
-- Ejecutar este script en el SQL Editor de Supabase/pgAdmin
-- =========================================================

ALTER TABLE iavolution.quiz_questions ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 10;

-- Recargar caché de PostgREST
NOTIFY pgrst, 'reload schema';

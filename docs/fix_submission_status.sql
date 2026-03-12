-- ==============================================================================
-- MIGRACIÓN: CORREGIR ESTADOS DE ENTREGAS
-- Sincroniza el campo 'status' con la existencia de una nota
-- ==============================================================================

-- 1. Actualizar todas las entregas que ya tienen nota a estado 'graded'
UPDATE iavolution.submissions
SET status = 'graded',
    graded_at = COALESCE(graded_at, now())
WHERE grade IS NOT NULL 
AND status = 'pending';

-- 2. Asegurarse de que si NO hay nota, el estado sea 'pending' (por si acaso)
UPDATE iavolution.submissions
SET status = 'pending'
WHERE grade IS NULL 
AND status = 'graded';

NOTIFY pgrst, 'reload schema';

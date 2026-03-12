-- ==============================================================================
-- MIGRACIÓN FINAL: ELIMINAR TODAS LAS RECURSIONES DE RLS RESTANTES
-- Ejecutar en el SQL Editor de Supabase
-- ==============================================================================

-- 1. PROGRESO DE LECCIONES
DROP POLICY IF EXISTS "Admins can view all progress" ON iavolution.lesson_progress;
CREATE POLICY "Staff can view all progress" ON iavolution.lesson_progress FOR SELECT USING (
    iavolution.is_admin() OR iavolution.is_manager()
);

-- 2. EVALUACIONES (Assignments, Quizzes, etc.)
DROP POLICY IF EXISTS "Profesores gestionan evaluaciones" ON iavolution.assignments;
CREATE POLICY "Staff manage assignments" ON iavolution.assignments FOR ALL USING (
    iavolution.is_admin() OR iavolution.is_manager() OR iavolution.is_teacher()
);

DROP POLICY IF EXISTS "Profesores gestionan entregas" ON iavolution.submissions;
CREATE POLICY "Staff manage submissions" ON iavolution.submissions FOR ALL USING (
    iavolution.is_admin() OR iavolution.is_manager() OR iavolution.is_teacher()
);

DROP POLICY IF EXISTS "Profesores gestionan cuestionarios" ON iavolution.quizzes;
CREATE POLICY "Staff manage quizzes" ON iavolution.quizzes FOR ALL USING (
    iavolution.is_admin() OR iavolution.is_manager() OR iavolution.is_teacher()
);

DROP POLICY IF EXISTS "Profesores gestionan preguntas" ON iavolution.quiz_questions;
CREATE POLICY "Staff manage quiz questions" ON iavolution.quiz_questions FOR ALL USING (
    iavolution.is_admin() OR iavolution.is_manager() OR iavolution.is_teacher()
);

-- Forzar recarga de los permisos cacheados de PostgREST
NOTIFY pgrst, 'reload schema';

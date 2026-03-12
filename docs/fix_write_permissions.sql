-- ==============================================================================
-- SCRIPT FINAL PARA PERMISOS COMPLETOS (POSTGREST)
-- Ejecutar en el SQL Editor de Supabase
-- ==============================================================================

-- Dar permisos completos (INSERT, UPDATE, DELETE, SELECT) a todas las tablas del esquema
GRANT ALL ON iavolution.roles TO authenticated;
GRANT ALL ON iavolution.profiles TO authenticated;
GRANT ALL ON iavolution.courses TO authenticated;
GRANT ALL ON iavolution.course_editions TO authenticated;
GRANT ALL ON iavolution.enrollments TO authenticated;
GRANT ALL ON iavolution.modules TO authenticated;
GRANT ALL ON iavolution.lessons TO authenticated;
GRANT ALL ON iavolution.materials TO authenticated;
GRANT ALL ON iavolution.lesson_progress TO authenticated;
GRANT ALL ON iavolution.assignments TO authenticated;
GRANT ALL ON iavolution.submissions TO authenticated;
GRANT ALL ON iavolution.quizzes TO authenticated;
GRANT ALL ON iavolution.quiz_questions TO authenticated;
GRANT ALL ON iavolution.quiz_attempts TO authenticated;

-- Dar acceso de lectura anonima a lo básico
GRANT SELECT ON iavolution.course_editions TO anon;

-- Dar acceso de uso a las secuencias (ids autoincrementales)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA iavolution TO authenticated;

-- Recargar la caché de permisos de PostgREST
NOTIFY pgrst, 'reload schema';

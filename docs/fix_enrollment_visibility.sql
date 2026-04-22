-- ==============================================================================
-- FIX: Visibilidad de Matrículas para Alumnos (IAVolution)
-- Ejecutar en el SQL Editor de Supabase si los alumnos ven 0 cursos activos.
-- ==============================================================================

-- 1. Permisos de esquema y tablas para el rol 'authenticated' (usuarios logueados)
GRANT USAGE ON SCHEMA iavolution TO authenticated;
GRANT SELECT ON iavolution.enrollments TO authenticated;
GRANT SELECT ON iavolution.courses TO authenticated;
GRANT SELECT ON iavolution.course_editions TO authenticated;
GRANT SELECT ON iavolution.modules TO authenticated;
GRANT SELECT ON iavolution.lessons TO authenticated;
GRANT SELECT ON iavolution.materials TO authenticated;

-- 2. Política: Los alumnos sólo pueden ver sus propias matrículas
DROP POLICY IF EXISTS "Users can view own enrollments" ON iavolution.enrollments;
CREATE POLICY "Users can view own enrollments"
    ON iavolution.enrollments FOR SELECT
    USING (auth.uid() = user_id);

-- 3. Política: Los cursos publicados son visibles para todos los alumnos
DROP POLICY IF EXISTS "Published courses are visible to all" ON iavolution.courses;
CREATE POLICY "Published courses are visible to all"
    ON iavolution.courses FOR SELECT
    USING (status = 'published');

-- 4. Política: Las ediciones de cursos son visibles para todos
DROP POLICY IF EXISTS "Editions are visible to all" ON iavolution.course_editions;
CREATE POLICY "Editions are visible to all"
    ON iavolution.course_editions FOR SELECT
    USING (true);

-- 5. Recargar la caché de PostgREST para que los cambios surtan efecto inmediato
NOTIFY pgrst, 'reload schema';

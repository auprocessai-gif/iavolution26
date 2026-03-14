-- ==============================================================================
-- SCRIPT: CORREGIR PERMISOS Y RLS DE PROYECTOS
-- ==============================================================================

-- 1. Asegurar que el esquema y las funciones son accesibles
GRANT USAGE ON SCHEMA iavolution TO authenticated;
GRANT EXECUTE ON FUNCTION iavolution.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION iavolution.is_admin() TO authenticated;

-- 2. Asegurar permisos en las nuevas tablas
GRANT SELECT ON iavolution.course_projects TO authenticated;
GRANT ALL ON iavolution.project_submissions TO authenticated;

-- 3. Simplificar y asegurar las políticas de RLS
-- Limpiamos primero
DROP POLICY IF EXISTS "Projects are viewable by everyone enrolled" ON iavolution.course_projects;
DROP POLICY IF EXISTS "Projects managed by staff" ON iavolution.course_projects;
DROP POLICY IF EXISTS "Students can view and create their own project submissions" ON iavolution.project_submissions;
DROP POLICY IF EXISTS "Staff can view and grade all project submissions" ON iavolution.project_submissions;

-- Políticas para Course Projects
CREATE POLICY "View projects" ON iavolution.course_projects
    FOR SELECT TO authenticated
    USING (true); -- Permitimos ver la definición a todos los autenticados (el filtrado fino se hace por curso)

-- Políticas para Submissions
CREATE POLICY "Student submissions" ON iavolution.project_submissions
    FOR ALL TO authenticated
    USING (user_id = auth.uid() OR iavolution.is_staff());

-- 4. Notificar cambios
NOTIFY pgrst, 'reload schema';

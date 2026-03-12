-- Refuerzo de permisos en capa base de datos (GRANTs)
GRANT SELECT ON iavolution.enrollments TO authenticated;
GRANT SELECT ON iavolution.courses TO authenticated;
GRANT SELECT ON iavolution.modules TO authenticated;
GRANT SELECT ON iavolution.lessons TO authenticated;

-- Restaurar política de lectura para alumnos en caso de haberse borrado
DROP POLICY IF EXISTS "Alumnos ven sus matriculaciones" ON iavolution.enrollments;
CREATE POLICY "Alumnos ven sus matriculaciones" 
    ON iavolution.enrollments FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Cursos publicados son públicos" ON iavolution.courses;
CREATE POLICY "Cursos publicados son públicos" 
    ON iavolution.courses FOR SELECT 
    USING (status = 'published');

-- Refresco forzado de la caché
NOTIFY pgrst, 'reload schema';

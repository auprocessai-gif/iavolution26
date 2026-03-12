-- Drop old recursive policies that query roles directly and fail with permission denied
DROP POLICY IF EXISTS "Admins ven todas las matriculaciones" ON iavolution.enrollments;
DROP POLICY IF EXISTS "Staff manage all enrollments" ON iavolution.enrollments;

CREATE POLICY "Staff manage all enrollments"
    ON iavolution.enrollments FOR ALL
    USING (iavolution.is_admin() OR iavolution.is_manager());

DROP POLICY IF EXISTS "Profesores gestionan sus cursos" ON iavolution.courses;

CREATE POLICY "Profesores gestionan sus cursos" ON iavolution.courses FOR ALL USING (
  teacher_id = auth.uid() OR 
  iavolution.is_admin() OR iavolution.is_manager()
);

-- Similarly for materials just in case
GRANT SELECT ON iavolution.materials TO authenticated;
GRANT SELECT ON iavolution.materials TO anon;

GRANT SELECT ON iavolution.roles TO authenticated;
GRANT SELECT ON iavolution.roles TO anon;

NOTIFY pgrst, 'reload schema';

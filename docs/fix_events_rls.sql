-- ==============================================================================
-- MIGRACIÓN: CORREGIR RLS EN EVENTOS Y PERMISOS
-- ==============================================================================

-- 1. Asegurar que el esquema y la tabla tengan permisos correctos
GRANT USAGE ON SCHEMA iavolution TO authenticated;
GRANT ALL ON iavolution.events TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA iavolution TO authenticated;

-- 2. Corregir políticas para evitar recursión y asegurar acceso a staff
DROP POLICY IF EXISTS "Anyone enrolled can view course events" ON iavolution.events;
CREATE POLICY "Anyone enrolled can view course events" 
ON iavolution.events FOR SELECT 
TO authenticated 
USING (
    iavolution.is_admin() OR iavolution.is_manager() OR iavolution.is_teacher()
    OR
    EXISTS (
        SELECT 1 FROM iavolution.enrollments e
        WHERE e.user_id = auth.uid() 
        AND e.course_id = iavolution.events.course_id
        AND (iavolution.events.edition_id IS NULL OR e.edition_id = iavolution.events.edition_id)
    )
);

DROP POLICY IF EXISTS "Admins and Teachers can manage events" ON iavolution.events;
DROP POLICY IF EXISTS "Staff manage events" ON iavolution.events;
CREATE POLICY "Staff manage events" 
ON iavolution.events FOR ALL 
TO authenticated 
USING (
    iavolution.is_admin() OR iavolution.is_manager() OR iavolution.is_teacher()
)
WITH CHECK (
    iavolution.is_admin() OR iavolution.is_manager() OR iavolution.is_teacher()
);

-- 3. Recargar PostgREST
NOTIFY pgrst, 'reload schema';

-- ==============================================================================
-- MIGRACIÓN COMPLETA: CREACIÓN DE TABLA DE EVENTOS Y POLÍTICAS RLS
-- ==============================================================================

-- 1. Asegurar que el esquema existe
CREATE SCHEMA IF NOT EXISTS iavolution;

-- 2. Crear la tabla de eventos si no existe
CREATE TABLE IF NOT EXISTS iavolution.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT DEFAULT 'tutoria', -- 'tutoria', 'exam', 'milestone', 'other'
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    course_id UUID REFERENCES iavolution.courses(id) ON DELETE CASCADE,
    edition_id UUID REFERENCES iavolution.course_editions(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Habilitar RLS
ALTER TABLE iavolution.events ENABLE ROW LEVEL SECURITY;

-- 4. Asegurar permisos de esquema y tabla
GRANT USAGE ON SCHEMA iavolution TO authenticated;
GRANT ALL ON iavolution.events TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA iavolution TO authenticated;

-- 5. Definir políticas RLS corregidas (sin recursión)

-- Política de lectura para alumnos matriculados y staff
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

-- Política de gestión total para Staff
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

-- 6. Recargar PostgREST
NOTIFY pgrst, 'reload schema';

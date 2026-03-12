-- Script para añadir "Ediciones" (Cohorts) a los cursos en IAVolution
-- ====================================================================

-- 1. Tabla de Ediciones de Curso
CREATE TABLE IF NOT EXISTS iavolution.course_editions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES iavolution.courses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- ej. "Edición Enero 2026"
    start_date DATE,
    end_date DATE,
    max_students INTEGER DEFAULT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE iavolution.course_editions ENABLE ROW LEVEL SECURITY;

-- Políticas para course_editions (Cualquiera puede verlas, solo admins/teachers pueden editarlas)
CREATE POLICY "Anyone can view course editions"
    ON iavolution.course_editions FOR SELECT
    USING (true);

CREATE POLICY "Admins specify course editions"
    ON iavolution.course_editions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM iavolution.profiles p
            JOIN iavolution.roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name IN ('admin', 'manager', 'teacher')
        )
    );

-- 2. Modificar la tabla enrollments
-- Añadimos la columna reference_id a la edición
ALTER TABLE iavolution.enrollments
ADD COLUMN IF NOT EXISTS edition_id UUID REFERENCES iavolution.course_editions(id) ON DELETE CASCADE;

-- Necesitamos eliminar la restricción UNIQUE actual (user_id, course_id)
-- para permitir matricularse en el mismo curso pero diferente edición.
-- Nota: En Postgres para hacer DROP CONSTRAINT necesitamos saber su nombre.
-- Supabase crea el nombre por defecto como 'enrollments_user_id_course_id_key'
ALTER TABLE iavolution.enrollments
DROP CONSTRAINT IF EXISTS enrollments_user_id_course_id_key;

-- Agregamos la nueva restricción UNIQUE (user_id, course_id, edition_id)
-- Así un usuario solo puede matricularse una vez por edición.
-- Para que postgres deje crearla si hay campos nulos de antes, idealmente rellenarlos o hacerla parcial,
-- Pero al ser todo UUID podemos manejarlo. Si hay enrollments previos, SU edition_id será NULL.
-- La restriccion UNIQUE con campos NULL puede dar problemas o permitir multples NULLs (depende pg version), 
-- pero con COALESCE se evita. Crearemos la unique_user_edition
ALTER TABLE iavolution.enrollments
ADD CONSTRAINT enrollments_user_id_edition_id_key UNIQUE (user_id, edition_id);


-- Permisos de lectura/escritura en la API
GRANT SELECT, INSERT, UPDATE, DELETE ON iavolution.course_editions TO authenticated;
GRANT SELECT ON iavolution.course_editions TO anon;

-- Recargar caché de PostgREST
NOTIFY pgrst, 'reload schema';

-- ==============================================================================
-- FIX: Permitir lectura de roles por parte de la API
-- ==============================================================================

-- 1. Crear política de lectura para roles (necesario para ver etiquetas de Alumno/Profesor)
DROP POLICY IF EXISTS "Roles are readable by everyone" ON iavolution.roles;
CREATE POLICY "Roles are readable by everyone" 
    ON iavolution.roles FOR SELECT 
    USING (true);

-- 2. Asegurar permisos de lectura en la tabla
GRANT SELECT ON iavolution.roles TO anon, authenticated;

-- 3. Refrescar caché de PostgREST
NOTIFY pgrst, 'reload schema';

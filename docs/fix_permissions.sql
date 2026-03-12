-- ==============================================================================
-- SCRIPT PARA REPARAR PERMISOS DE LECTURA (POSTGREST)
-- Ejecutar en el SQL Editor de Supabase
-- ==============================================================================

-- 1. Dar permiso de uso del esquema a los roles de la API
GRANT USAGE ON SCHEMA iavolution TO anon, authenticated, service_role;

-- 2. Dar permiso de lectura (SELECT) a todas las tablas base para autenticados
GRANT SELECT ON iavolution.roles TO authenticated;
GRANT SELECT ON iavolution.profiles TO authenticated;
GRANT SELECT ON iavolution.courses TO authenticated;
GRANT SELECT ON iavolution.enrollments TO authenticated;
GRANT SELECT ON iavolution.modules TO authenticated;
GRANT SELECT ON iavolution.lessons TO authenticated;
GRANT SELECT ON iavolution.materials TO authenticated;

-- (Opcional pero recomendado) Dar todos los permisos a las cuentas de servicio
GRANT ALL ON ALL TABLES IN SCHEMA iavolution TO postgres, service_role;

-- 3. Muy importante: recargar la caché de permisos de PostgREST
NOTIFY pgrst, 'reload schema';

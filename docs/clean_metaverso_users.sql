-- ==============================================================================
-- LIMPIEZA INMEDIATA PARA LA PLATAFORMA EN VIVO
-- ==============================================================================

-- 1. Sacar a los usuarios del Metaverso de la tabla de Iavolution.
-- (No te preocupes, esto NO borra sus cuentas reales de auth.users ni del metaverso, 
-- solo los quita de la lista de alumnos de esta plataforma específica).
DELETE FROM iavolution.profiles
WHERE email IN (
    'oreoterrier@gmail.com',
    'oreo@gmail.com',
    'alfonsohj@gmail.com'
) 
OR email ILIKE '%prueba%';

-- 2. Restaurar a Katia Arevalo a la fuerza
-- Para asegurarnos de que Katia aparezca, insertamos su perfil basándonos en 
-- una búsqueda amplia de su nombre o correo en las cuentas maestras.
INSERT INTO iavolution.profiles (id, email, name, role_id, status)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'name', email), 
    (SELECT id FROM iavolution.roles WHERE name = 'student' LIMIT 1), 
    'active'
FROM auth.users 
WHERE email ILIKE '%katia%' OR raw_user_meta_data->>'name' ILIKE '%katia%'
ON CONFLICT (id) DO NOTHING;

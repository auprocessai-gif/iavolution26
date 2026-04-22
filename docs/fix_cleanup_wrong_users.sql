-- ==============================================================================
-- FIX: Limpiar usuarios de otros proyectos que se colaron en iavolution.profiles
-- El script de sincronización anterior importó TODOS los usuarios de auth.users.
-- Aquí eliminamos los que NO pertenecen a IAVolution.
--
-- Los usuarios de IAVolution tienen raw_user_meta_data->>'role' con valor:
-- 'student', 'teacher', 'admin', 'manager'
-- Los usuarios de otros proyectos (metaverso, etc.) NO tienen ese campo.
-- ==============================================================================

-- 1. Ver cuántos perfiles van a eliminarse (ejecuta esto primero para revisar)
SELECT p.id, p.email, p.name, p.created_at,
       u.raw_user_meta_data->>'role' AS meta_role
FROM iavolution.profiles p
JOIN auth.users u ON u.id = p.id
WHERE (u.raw_user_meta_data->>'role') IS NULL
   OR (u.raw_user_meta_data->>'role') NOT IN ('student', 'teacher', 'admin', 'manager')
ORDER BY p.created_at DESC;

-- 2. BORRAR los perfiles de otros proyectos (ejecuta esto después de revisar el paso 1)
-- DESCOMENTA el siguiente bloque cuando estés seguro:

/*
DELETE FROM iavolution.profiles
WHERE id IN (
    SELECT p.id
    FROM iavolution.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE (u.raw_user_meta_data->>'role') IS NULL
       OR (u.raw_user_meta_data->>'role') NOT IN ('student', 'teacher', 'admin', 'manager')
);
*/

-- 3. Verificar cuántos quedan después del borrado
-- SELECT COUNT(*) FROM iavolution.profiles;

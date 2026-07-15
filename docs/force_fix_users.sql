-- ==============================================================================
-- SCRIPT DE RECUPERACIÓN Y LIMPIEZA DEFINITIVA DE USUARIOS
-- Ejecuta este script en el SQL Editor de Supabase
-- ==============================================================================

-- ==============================================================================
-- 0. Asegurarnos de que existe la columna 'app'
ALTER TABLE iavolution.profiles 
ADD COLUMN IF NOT EXISTS app VARCHAR(50) DEFAULT 'iavolution';

-- 1. Restaurar a Katia Arevalo
-- Buscamos a Katia en la tabla principal de autenticación (auth.users) y la 
-- insertamos a la fuerza en iavolution.profiles con el rol de 'student'.
INSERT INTO iavolution.profiles (id, email, name, role_id, status, app)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'name', email), 
    (SELECT id FROM iavolution.roles WHERE name = 'student' LIMIT 1), 
    'active', 
    'iavolution'
FROM auth.users 
WHERE email ILIKE '%katia%' OR raw_user_meta_data->>'name' ILIKE '%katia%'
ON CONFLICT (id) DO UPDATE 
SET app = 'iavolution', status = 'active';

-- 2. Asegurarnos que todos los existentes tengan al menos la columna 'app' seteada a 'iavolution'
UPDATE iavolution.profiles
SET app = 'iavolution'
WHERE app IS NULL;

-- 3. Mover a los usuarios del Metaverso (B2B / Ferias Virtuales) a la etiqueta 'metaverso'
-- De esta forma el panel de Iavolution (que ahora filtra por app = 'iavolution') ya no los mostrará.
UPDATE iavolution.profiles
SET app = 'metaverso'
WHERE email IN (
    'oreoterrier@gmail.com',
    'oreo@gmail.com',
    'alfonsohj@gmail.com'
) 
OR email ILIKE '%prueba%';

-- (Opcional) Si hay otros usuarios con 'metaverso' en su metadata, también los marcamos
UPDATE iavolution.profiles p
SET app = 'metaverso'
FROM auth.users u
WHERE p.id = u.id AND u.raw_user_meta_data->>'app' = 'metaverso';

-- ==============================================================================
-- ¡Listo! Una vez ejecutado este script, ve a tu panel de alumnos y recarga la página.
-- Katia ya debe estar en la lista, y los de ferias/B2B habrán desaparecido.
-- ==============================================================================

-- ==============================================================================
-- CORRECCIÓN DE CORREOS ELECTRÓNICOS DE ALUMNOS (SEPTIEMBRE 2026)
-- ==============================================================================

DO $$
BEGIN
    -- 1. Jeniffer Vanesa Salguero García
    -- Corrección: de jeniffersalgueroz21@gmail.com -> jeniffersalguero21@gmail.com
    UPDATE auth.users
    SET email = 'jeniffersalguero21@gmail.com',
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
    WHERE email = 'jeniffersalgueroz21@gmail.com' 
       OR id = '462c5561-2161-4bab-b8c3-2360497c9be5';

    UPDATE iavolution.profiles
    SET email = 'jeniffersalguero21@gmail.com'
    WHERE email = 'jeniffersalgueroz21@gmail.com' 
       OR id = '462c5561-2161-4bab-b8c3-2360497c9be5';

    -- 2. Beatriz Elena Ibarra Aguirre
    -- Corrección: de elenaibarra1545@gmail.com -> elena.ibarra1595@gmail.com
    UPDATE auth.users
    SET email = 'elena.ibarra1595@gmail.com',
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
    WHERE email = 'elenaibarra1545@gmail.com' 
       OR id = 'eff20d8a-c19a-4dc4-9e8b-51abdd0cca29';

    UPDATE iavolution.profiles
    SET email = 'elena.ibarra1595@gmail.com'
    WHERE email = 'elenaibarra1545@gmail.com' 
       OR id = 'eff20d8a-c19a-4dc4-9e8b-51abdd0cca29';

END $$;

-- Recargar caché de PostgREST
NOTIFY pgrst, 'reload schema';

-- Consulta de verificación
SELECT 
    p.name AS "Alumno",
    p.email AS "Correo Actualizado",
    u.email AS "Correo Auth",
    e.enrolled_at AS "Fecha Matricula"
FROM iavolution.profiles p
JOIN auth.users u ON u.id = p.id
LEFT JOIN iavolution.enrollments e ON e.user_id = p.id
WHERE p.email IN ('jeniffersalguero21@gmail.com', 'elena.ibarra1595@gmail.com');

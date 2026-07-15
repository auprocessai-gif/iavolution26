-- ==============================================================================
-- RESTAURAR A KATIA (VERSIÓN DEFINITIVA Y SIMPLE)
-- ==============================================================================

DO $$
DECLARE
    student_role_id UUID;
BEGIN
    -- 1. Conseguir el rol de Adonay (que sabemos que funciona)
    SELECT role_id INTO student_role_id 
    FROM iavolution.profiles 
    WHERE email = 'alenchoni@icloud.com' LIMIT 1;

    -- 2. Insertar a Katia SIN usar columnas nuevas (por si no se crearon)
    INSERT INTO iavolution.profiles (id, email, name, role_id, status)
    SELECT 
        id, 
        email, 
        COALESCE(raw_user_meta_data->>'name', email), 
        student_role_id, 
        'active'
    FROM auth.users 
    WHERE email = 'arevalo.katia@gmail.com'
    ON CONFLICT (id) DO UPDATE SET 
        role_id = EXCLUDED.role_id,
        status = 'active',
        email = EXCLUDED.email;
END $$;

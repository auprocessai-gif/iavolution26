-- ==============================================================================
-- RESTAURAR A KATIA (VERSIÓN A PRUEBA DE FALLOS)
-- ==============================================================================

-- Si por alguna razón el rol 'student' se llama diferente, tomamos prestado el 
-- role_id de otro alumno que ya esté funcionando bien (ej. Adonay).
DO $$
DECLARE
    student_role_id UUID;
BEGIN
    -- Conseguir el rol correcto basándonos en un alumno que SÍ sale en la lista
    SELECT role_id INTO student_role_id 
    FROM iavolution.profiles 
    WHERE email = 'alenchoni@icloud.com' LIMIT 1;

    -- Insertar o actualizar a Katia con el rol correcto
    INSERT INTO iavolution.profiles (id, email, name, role_id, status, app)
    SELECT 
        id, 
        email, 
        COALESCE(raw_user_meta_data->>'name', email), 
        student_role_id, 
        'active',
        'iavolution'
    FROM auth.users 
    WHERE email = 'arevalo.katia@gmail.com'
    ON CONFLICT (id) DO UPDATE SET 
        role_id = EXCLUDED.role_id,
        status = 'active',
        app = 'iavolution',
        email = EXCLUDED.email;
END $$;

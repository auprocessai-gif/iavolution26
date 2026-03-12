-- SCRIPT DEFINITIVO PARA RECUPERAR CUENTAS
-- Ejecutar en el SQL Editor de Supabase

DO $$
DECLARE
    admin_role_id UUID;
    student_role_id UUID;
BEGIN
    -- 1. Asegurarnos de que los roles existan
    INSERT INTO iavolution.roles (name, description) VALUES
    ('admin', 'Administrador total del sistema'),
    ('manager', 'Gestor Académico'),
    ('teacher', 'Profesor'),
    ('student', 'Alumno')
    ON CONFLICT (name) DO NOTHING;

    -- Obtener los IDs de los roles
    SELECT id INTO admin_role_id FROM iavolution.roles WHERE name = 'admin' LIMIT 1;
    SELECT id INTO student_role_id FROM iavolution.roles WHERE name = 'student' LIMIT 1;

    -- 2. Asegurarnos de que ABSOLUTAMENTE TODOS los usuarios registrados 
    -- tengan un perfil creado en la tabla IAVolution.
    INSERT INTO iavolution.profiles (id, email, name, role_id)
    SELECT 
        id, 
        email, 
        COALESCE(raw_user_meta_data->>'name', 'Usuario Restaurado'),
        student_role_id
    FROM auth.users
    ON CONFLICT (id) DO NOTHING;

    -- 3. Forzar, sí o sí, que info@hispa3d.com sea Administrador
    UPDATE iavolution.profiles 
    SET role_id = admin_role_id
    WHERE email = 'info@hispa3d.com';

END $$;

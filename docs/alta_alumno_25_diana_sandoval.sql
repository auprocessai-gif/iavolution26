-- ==============================================================================
-- ALTA Y MATRICULACIÓN DE ALUMNO INDIVIDUAL (#25)
-- Alumno: Diana Stephanie Sandoval Aguilar
-- Edición: Septiembre 2026
-- Diplomado en Automatización de Procesos con IA
-- ==============================================================================

DO $$
DECLARE
    v_user_id UUID;
    v_email TEXT := lower(trim('iam.dianasandoval@gmail.com'));
    v_name TEXT := 'Diana Stephanie Sandoval Aguilar';
    v_pass TEXT := 'IAV2026*1598';
    v_course_id UUID := '175d879d-08a8-4c64-85e0-47ad97f5e1e8';
    v_edition_id UUID := '9725e5d4-58d9-4e3c-9b6a-1c2c4cccda2c';
    v_role_id UUID := 'b8fe19b8-2ad0-4131-8f61-5e5677b8d57e';
BEGIN
    -- 1. Buscar si ya existe el usuario en auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

    IF v_user_id IS NULL THEN
        v_user_id := gen_random_uuid();
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_user_id,
            'authenticated',
            'authenticated',
            v_email,
            crypt(v_pass, gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            json_build_object('name', v_name, 'role', 'student', 'app', 'iavolution')::jsonb,
            NOW(),
            NOW()
        );
    ELSE
        UPDATE auth.users 
        SET encrypted_password = crypt(v_pass, gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            updated_at = NOW()
        WHERE id = v_user_id;
    END IF;

    -- 2. Asegurar registro en iavolution.profiles
    INSERT INTO iavolution.profiles (id, email, name, role_id, status, app)
    VALUES (
        v_user_id,
        v_email,
        v_name,
        v_role_id,
        'active',
        'iavolution'
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        role_id = v_role_id,
        status = 'active',
        app = 'iavolution';

    -- 3. Matricular en el Diplomado y en la Edición Septiembre 2026
    INSERT INTO iavolution.enrollments (user_id, course_id, edition_id)
    VALUES (
        v_user_id,
        v_course_id,
        v_edition_id
    )
    ON CONFLICT (user_id, edition_id) DO NOTHING;

END $$;

-- Recargar caché de PostgREST
NOTIFY pgrst, 'reload schema';

-- Comprobación del alumno matriculado
SELECT 
    p.name AS "Alumno",
    p.email AS "Correo",
    e.enrolled_at AS "Fecha Matricula",
    ce.name AS "Edicion"
FROM iavolution.enrollments e
JOIN iavolution.profiles p ON e.user_id = p.id
JOIN iavolution.course_editions ce ON e.edition_id = ce.id
WHERE p.email = 'iam.dianasandoval@gmail.com';

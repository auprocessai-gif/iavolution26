-- ==============================================================================
-- REPARACIÓN Y RESTAURACIÓN DEFINITIVA DE ACCESO: DIANA SANDOVAL
-- Resuelve el error 500: "Database error querying schema" en Supabase GoTrue
-- Alumno: Diana Stephanie Sandoval Aguilar (#25)
-- Email: iam.dianasandoval@gmail.com
-- Contraseña temporal: IAV2026*1598
-- ==============================================================================

-- 1. Saneamiento global preventivo de columnas NULL en auth.users
UPDATE auth.users
SET 
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change = COALESCE(email_change, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    reauthentication_token = COALESCE(reauthentication_token, ''),
    phone_change = COALESCE(phone_change, ''),
    phone_change_token = COALESCE(phone_change_token, '')
WHERE confirmation_token IS NULL
   OR recovery_token IS NULL
   OR email_change_token_new IS NULL
   OR email_change IS NULL
   OR email_change_token_current IS NULL
   OR reauthentication_token IS NULL;

-- 2. Reparación específica y enlace de Identidad para Diana Sandoval
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
    -- Buscar si ya existe el usuario en auth.users
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
            confirmation_token,
            recovery_token,
            email_change_token_new,
            email_change,
            email_change_token_current,
            reauthentication_token,
            phone_change,
            phone_change_token,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
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
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '{"provider":"email","providers":["email"]}'::jsonb,
            json_build_object('name', v_name, 'role', 'student', 'app', 'iavolution')::jsonb,
            false,
            NOW(),
            NOW()
        );
    ELSE
        -- Actualizar y forzar todos los tokens a vacíos y contraseña encriptada
        UPDATE auth.users
        SET encrypted_password = crypt(v_pass, gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            confirmation_token = '',
            recovery_token = '',
            email_change_token_new = '',
            email_change = '',
            email_change_token_current = '',
            reauthentication_token = '',
            phone_change = '',
            phone_change_token = '',
            raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
            raw_user_meta_data = json_build_object('name', v_name, 'role', 'student', 'app', 'iavolution')::jsonb,
            aud = 'authenticated',
            role = 'authenticated',
            banned_until = NULL,
            deleted_at = NULL,
            updated_at = NOW()
        WHERE id = v_user_id;
    END IF;

    -- 3. Asegurar registro en auth.identities (id es UUID, provider_id es TEXT)
    DELETE FROM auth.identities WHERE user_id = v_user_id;

    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        v_user_id,
        json_build_object('sub', v_user_id::text, 'email', v_email)::jsonb,
        'email',
        v_user_id::text,
        NOW(),
        NOW(),
        NOW()
    );

    -- 4. Asegurar registro en iavolution.profiles
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

    -- 5. Matricular en el Diplomado y en la Edición Septiembre 2026
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

-- Consulta de verificación
SELECT 
    p.name AS "Alumno",
    p.email AS "Correo",
    u.id AS "Auth ID",
    u.email_confirmed_at AS "Email Confirmado",
    ce.name AS "Edición Matriculada"
FROM iavolution.profiles p
JOIN auth.users u ON u.id = p.id
LEFT JOIN iavolution.enrollments e ON e.user_id = p.id
LEFT JOIN iavolution.course_editions ce ON e.edition_id = ce.id
WHERE p.email = 'iam.dianasandoval@gmail.com';

-- ==============================================================================
-- ALTA MASIVA Y MATRICULACIÓN DE ALUMNOS (EDICIÓN SEPTIEMBRE 2026)
-- Diplomado en Automatización de Procesos con IA
-- ==============================================================================

DO $$
DECLARE
    v_user_id UUID;
    v_course_id UUID := '175d879d-08a8-4c64-85e0-47ad97f5e1e8';
    v_edition_id UUID := '9725e5d4-58d9-4e3c-9b6a-1c2c4cccda2c';
    v_role_id UUID := 'b8fe19b8-2ad0-4131-8f61-5e5677b8d57e';
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT * FROM (VALUES
            ('Jeniffer Vanesa Salguero García', 'jeniffersalguero21@gmail.com', 'IAV2026*6948'),
            ('Sergio Ivan Perez Delgado', 'perezsergioivan@gmail.com', 'IAV2026*4608'),
            ('Erick Rafael Aguilar Puente', 'ingeniero.erickaguilar@gmail.com', 'IAV2026*8925'),
            ('José Humberto Estrada', 'correo.estrada.personal@gmail.com', 'IAV2026*6446'),
            ('Ronald Giovanny Cardona Valdez', 'rgcvaldez@gmail.com', 'IAV2026*0468'),
            ('Irvin Osmanio Cuellar Escobar', 'escollar23@gmail.com', 'IAV2026*9763'),
            ('Medardo Melquisidec Ruano Martinez', 'melquiruano@gmail.com', 'IAV2026*0898'),
            ('Alison Vanessa Córdova Olivia', 'avco1408@outlook.com', 'IAV2026*4063'),
            ('Karen Lisseth Aguirre Joachin', 'karen_298@msn.com', 'IAV2026*1624'),
            ('Julio Salvador Artiga Gil', 'julioartiga@bufeteartigagil.com', 'IAV2026*4117'),
            ('Ricardo Ernesto Orellana López', 'rcorellana.1999@gmail.com', 'IAV2026*2593'),
            ('Felix Armando Perez Guadron', 'felix.perez@almaconsa.com.sv', 'IAV2026*7347'),
            ('Dagoberto Zelaya', 'dagoberto.zelaya@almaconsa.com.sv', 'IAV2026*7558'),
            ('Carlos Antonio Cerón Amaya', 'carlos.ceron@almaconsa.com.sv', 'IAV2026*9040'),
            ('Maria Gabriela Molina Morales', 'gabymolina_2010@hotmail.com', 'IAV2026*4218'),
            ('Marvin Rodrigo Vásquez Ramírez', 'marvin.mvasquez@outlook.com', 'IAV2026*0334'),
            ('Arthur Roberto Dueñas Alcántara', 'arthurduenas72@gmail.com', 'IAV2026*9884'),
            ('Guillermo Alex Hernandez Díaz', 'gernandez77@hotmail.com', 'IAV2026*3130'),
            ('Mario Arturo Hernández Barrera', 'mahbarrera@gmail.com', 'IAV2026*1369'),
            ('Beatriz Elena Ibarra Aguirre', 'elena.ibarra1595@gmail.com', 'IAV2026*4097'),
            ('Eduardo Wilfredo Ortiz Molina', 'gestionempresarial@acoyec.com', 'IAV2026*2149'),
            ('Erika Valentina Mejia Lopez', 'erikavalentinamejia@gmail.com', 'IAV2026*9451'),
            ('Lucia Emperatriz Hernández Romero', 'luemheme@gmail.com', 'IAV2026*3020'),
            ('Héctor Jonathan Serpas Hurtado', 'hector.serpas@sslogistica.com', 'IAV2026*6379'),
            ('Diana Stephanie Sandoval Aguilar', 'iam.dianasandoval@gmail.com', 'IAV2026*1598')
        ) AS t(name, email, pass)
    LOOP
        -- 1. Buscar si ya existe en auth.users
        SELECT id INTO v_user_id FROM auth.users WHERE email = lower(trim(rec.email));

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
                lower(trim(rec.email)),
                crypt(rec.pass, gen_salt('bf')),
                NOW(),
                '{"provider":"email","providers":["email"]}'::jsonb,
                json_build_object('name', rec.name, 'role', 'student', 'app', 'iavolution')::jsonb,
                NOW(),
                NOW()
            );
        ELSE
            -- Si ya existía, actualizamos su contraseña para que pueda entrar con la clave asignada
            UPDATE auth.users 
            SET encrypted_password = crypt(rec.pass, gen_salt('bf')),
                email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
                updated_at = NOW()
            WHERE id = v_user_id;
        END IF;

        -- 2. Asegurar registro en iavolution.profiles
        INSERT INTO iavolution.profiles (id, email, name, role_id, status, app)
        VALUES (
            v_user_id,
            lower(trim(rec.email)),
            rec.name,
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

    END LOOP;
END $$;

-- Recargar caché de PostgREST
NOTIFY pgrst, 'reload schema';

-- Comprobación final de matriculados en Septiembre 2026
SELECT 
    p.name AS "Alumno",
    p.email AS "Correo",
    e.enrolled_at AS "Fecha Matricula",
    ce.name AS "Edicion"
FROM iavolution.enrollments e
JOIN iavolution.profiles p ON e.user_id = p.id
JOIN iavolution.course_editions ce ON e.edition_id = ce.id
WHERE e.edition_id = '9725e5d4-58d9-4e3c-9b6a-1c2c4cccda2c'
ORDER BY p.name ASC;

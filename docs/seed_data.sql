-- ==============================================================================
-- SCRIPT DE RECUPERACIÓN DE DATOS BASE (SEMILLA)
-- Ejecutar en el SQL Editor de Supabase después de tener las tablas creadas
-- ==============================================================================

-- 1. Restaurar Roles 
INSERT INTO iavolution.roles (name, description) VALUES
('admin', 'Administrador total del sistema'),
('manager', 'Gestor Académico'),
('teacher', 'Profesor'),
('student', 'Alumno')
ON CONFLICT (name) DO NOTHING;

-- 2. Recuperar el usuario Admnistrador (el tuyo)
-- Como las cuentas siguen en auth.users pero no en profiles,
-- forzamos la creación del perfil Admin para el primer usuario registrado.
DO $$
DECLARE
    first_user_id UUID;
    admin_role_id UUID;
    student_role_id UUID;
BEGIN
    -- Obtener el ID del rol de administrador
    SELECT id INTO admin_role_id FROM iavolution.roles WHERE name = 'admin';
    -- Obtener el ID del rol de estudiante por defecto
    SELECT id INTO student_role_id FROM iavolution.roles WHERE name = 'student';

    -- Insertar todos los usuarios de auth.users que no tengan perfil,
    -- dándole rol 'admin' al primero y 'student' al resto.
    -- (Esto asegura que puedas volver a entrar a tu aplicación sin perder tu cuenta).
    INSERT INTO iavolution.profiles (id, email, name, role_id)
    SELECT 
        u.id, 
        u.email, 
        COALESCE(u.raw_user_meta_data->>'name', 'Usuario Local'),
        -- Si es el primer usuario, le damos admin, al resto alumno
        CASE WHEN u.id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1) 
             THEN admin_role_id 
             ELSE student_role_id 
        END
    FROM auth.users u
    LEFT JOIN iavolution.profiles p ON u.id = p.id
    WHERE p.id IS NULL;

END $$;


-- 3. Crear un Curso de Prueba Recuperado
DO $$
DECLARE
    new_course_id UUID;
    new_module_id UUID;
    new_lesson_id UUID;
    profesor_id UUID;
BEGIN
    -- Pillamos a tu usuario admin como profesor para este curso
    SELECT p.id INTO profesor_id FROM iavolution.profiles p
    JOIN iavolution.roles r ON p.role_id = r.id WHERE r.name = 'admin' LIMIT 1;

    -- Solo insertar si no hay cursos para evitar duplicados al correrlo 2 veces
    IF NOT EXISTS (SELECT 1 FROM iavolution.courses) THEN
        
        -- Curso
        INSERT INTO iavolution.courses (title, description, category, status, teacher_id)
        VALUES ('Máster en IA Generativa (Recuperado)', 'Este curso de prueba ha sido recuperado tras la pérdida de datos.', 'Inteligencia Artificial', 'published', profesor_id)
        RETURNING id INTO new_course_id;

        -- Edición
        INSERT INTO iavolution.course_editions (course_id, name, status)
        VALUES (new_course_id, 'Edición Recuperación 2026', 'active');

        -- Modulo
        INSERT INTO iavolution.modules (title, course_id, "order")
        VALUES ('Introducción a Inteligencia Artificial', new_course_id, 1)
        RETURNING id INTO new_module_id;

        -- Lección
        INSERT INTO iavolution.lessons (title, module_id, "order")
        VALUES ('Qué es un LLM', new_module_id, 1)
        RETURNING id INTO new_lesson_id;

        -- Material (Un video de ejemplo)
        INSERT INTO iavolution.materials (title, type, file_url, lesson_id)
        VALUES ('Vídeo: Bienvenida', 'video', 'https://www.w3schools.com/html/mov_bbb.mp4', new_lesson_id);

    END IF;
END $$;

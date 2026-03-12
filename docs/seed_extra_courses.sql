-- ==============================================================================
-- SCRIPT PARA AÑADIR NUEVOS CURSOS DE PRUEBA
-- Ejecutar en el SQL Editor de Supabase
-- ==============================================================================

DO $$
DECLARE
    profesor_id UUID;
    curso1_id UUID;
    curso2_id UUID;
    curso3_id UUID;
    modulo_id UUID;
    leccion_id UUID;
BEGIN
    -- 1. Intentamos obtener tu usuario admin u otro profesor para asignarles los cursos
    SELECT p.id INTO profesor_id FROM iavolution.profiles p
    JOIN iavolution.roles r ON p.role_id = r.id WHERE r.name IN ('admin', 'teacher') LIMIT 1;

    -- ==========================================
    -- CURSO 1: ChatGPT para Empresas
    -- ==========================================
    INSERT INTO iavolution.courses (title, description, category, status, teacher_id, cover_image_url)
    VALUES (
        'ChatGPT para Productividad Empresarial', 
        'Aprende a integrar ChatGPT en los procesos diarios de tu empresa para ahorrar horas de trabajo.', 
        'Productividad', 
        'published', 
        profesor_id,
        'https://images.unsplash.com/photo-1661956602116-aa6865609028?w=800&q=80'
    ) RETURNING id INTO curso1_id;

    -- Módulo y Lección para Curso 1
    INSERT INTO iavolution.modules (title, course_id, "order") VALUES ('Automatización Básica', curso1_id, 1) RETURNING id INTO modulo_id;
    INSERT INTO iavolution.lessons (title, module_id, "order") VALUES ('Creación de Prompts de Negocio', modulo_id, 1) RETURNING id INTO leccion_id;
    INSERT INTO iavolution.materials (title, type, file_url, lesson_id) VALUES ('Guía PDF Prompts', 'pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', leccion_id);
    
    -- Edición activa Curso 1
    INSERT INTO iavolution.course_editions (course_id, name, status) VALUES (curso1_id, 'Edición Empresas 2026', 'active');


    -- ==========================================
    -- CURSO 2: Midjourney y Creación Visual
    -- ==========================================
    INSERT INTO iavolution.courses (title, description, category, status, teacher_id, cover_image_url)
    VALUES (
        'Midjourney y Arte Generativo', 
        'Domina la generación de imágenes con inteligencia artificial para diseño gráfico y marketing.', 
        'Diseño', 
        'published', 
        profesor_id,
        'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800&q=80'
    ) RETURNING id INTO curso2_id;

    -- Edición activa Curso 2
    INSERT INTO iavolution.course_editions (course_id, name, status) VALUES (curso2_id, 'Edición Creativos 2026', 'active');


    -- ==========================================
    -- CURSO 3: Python para IA (Borrador)
    -- ==========================================
    INSERT INTO iavolution.courses (title, description, category, status, teacher_id, cover_image_url)
    VALUES (
        'Fundamentos de Python para IA', 
        'Curso técnico introductorio para aprender a conectar con APIs de OpenAI y Anthropic.', 
        'Programación', 
        'draft', -- Este curso aparecerá como borrador
        profesor_id,
        'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80'
    ) RETURNING id INTO curso3_id;

END $$;

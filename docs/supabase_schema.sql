-- IAVolution: Esquema de Base de Datos para Supabase (Self-hosted Multi-tenant)

-- ==========================================
-- CREACIÓN DEL ESQUEMA AISLADO
-- ==========================================
-- Creamos un esquema dedicado para no interferir con tu proyecto del metaverso
CREATE SCHEMA IF NOT EXISTS iavolution;

-- 1. Tabla de Roles
CREATE TABLE iavolution.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar roles por defecto
INSERT INTO iavolution.roles (name, description) VALUES
('admin', 'Administrador total del sistema'),
('manager', 'Gestor Académico'),
('teacher', 'Profesor'),
('student', 'Alumno');

-- 2. Tabla de Perfiles (Extensión de auth.users de Supabase)
CREATE TABLE iavolution.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    role_id UUID REFERENCES iavolution.roles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para crear un perfil automáticamente cada vez que un usuario se registra en auth.users
CREATE OR REPLACE FUNCTION iavolution.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    target_role_id UUID;
    target_role_name TEXT;
BEGIN
    -- Get role name from metadata, default to 'student'
    target_role_name := COALESCE(new.raw_user_meta_data->>'role', 'student');

    -- Get the ID of the role
    SELECT id INTO target_role_id FROM iavolution.roles WHERE name = target_role_name;

    -- If role not found, default to student
    IF target_role_id IS NULL THEN
        SELECT id INTO target_role_id FROM iavolution.roles WHERE name = 'student';
    END IF;

    INSERT INTO iavolution.profiles (id, email, name, role_id)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'name', target_role_id);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminamos el trigger si ya existiera para evitar errores
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE iavolution.handle_new_user();

-- 3. Tabla de Cursos
CREATE TABLE iavolution.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    category VARCHAR(100),
    teacher_id UUID REFERENCES iavolution.profiles(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de Matriculaciones (Enrollments)
CREATE TABLE iavolution.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES iavolution.profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES iavolution.courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    UNIQUE(user_id, course_id)
);

-- 5. Tabla de Módulos
CREATE TABLE iavolution.modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    course_id UUID REFERENCES iavolution.courses(id) ON DELETE CASCADE,
    "order" INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabla de Lecciones
CREATE TABLE iavolution.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    module_id UUID REFERENCES iavolution.modules(id) ON DELETE CASCADE,
    "order" INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabla de Materiales
CREATE TABLE iavolution.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('pdf', 'video', 'link', 'presentation', 'file', 'code')),
    file_url TEXT NOT NULL,
    lesson_id UUID REFERENCES iavolution.lessons(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Tabla de Progreso de Lecciones
CREATE TABLE iavolution.lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES iavolution.profiles(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES iavolution.lessons(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, lesson_id)
);

-- 9. Tabla de Tareas (Assignments)
CREATE TABLE iavolution.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES iavolution.lessons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    instructions TEXT,
    max_points INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Tabla de Entregas (Submissions)
CREATE TABLE iavolution.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES iavolution.assignments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES iavolution.profiles(id) ON DELETE CASCADE,
    file_url TEXT,
    content TEXT, -- Para respuestas de texto
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'graded', 'resubmit')),
    grade DECIMAL(5,2),
    feedback TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    graded_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, assignment_id)
);

-- 11. Tabla de Cuestionarios (Quizzes)
CREATE TABLE iavolution.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES iavolution.lessons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    passing_score INTEGER DEFAULT 70,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Tabla de Preguntas de Cuestionario
CREATE TABLE iavolution.quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES iavolution.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- Array de strings: ["A", "B", "C"]
    correct_answer INTEGER NOT NULL, -- Índice del array de opciones
    "order" INTEGER NOT NULL
);

-- 13. Tabla de Intentos de Cuestionario
CREATE TABLE iavolution.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES iavolution.quizzes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES iavolution.profiles(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Activar RLS en las tablas
ALTER TABLE iavolution.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE iavolution.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE iavolution.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE iavolution.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE iavolution.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE iavolution.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE iavolution.materials ENABLE ROW LEVEL SECURITY;

-- Políticas para Profiles
CREATE POLICY "Public profiles are viewable by everyone" ON iavolution.profiles FOR SELECT USING (true);
CREATE POLICY "Admins have full access to profiles" ON iavolution.profiles FOR ALL USING (
  EXISTS (
    SELECT 1 FROM iavolution.roles r 
    WHERE r.id = (SELECT role_id FROM iavolution.profiles p WHERE p.id = auth.uid()) 
    AND r.name = 'admin'
  )
);
CREATE POLICY "Users can update own profile name" ON iavolution.profiles FOR UPDATE USING (auth.uid() = id);

-- Políticas para Cursos
CREATE POLICY "Cursos publicados son públicos" ON iavolution.courses FOR SELECT USING (status = 'published');
CREATE POLICY "Profesores gestionan sus cursos" ON iavolution.courses FOR ALL USING (
  teacher_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM iavolution.roles r 
    JOIN iavolution.profiles p ON p.role_id = r.id
    WHERE p.id = auth.uid() AND (r.name = 'admin' OR r.name = 'manager')
  )
);

-- Políticas para Enrollments
CREATE POLICY "Alumnos ven sus matriculaciones" ON iavolution.enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins ven todas las matriculaciones" ON iavolution.enrollments FOR ALL USING (
  EXISTS (
    SELECT 1 FROM iavolution.roles r 
    JOIN iavolution.profiles p ON p.role_id = r.id
    WHERE p.id = auth.uid() AND (r.name = 'admin' OR r.name = 'manager')
  )
);

-- Políticas básicas de lectura para el contenido académico
CREATE POLICY "Todo el mundo lee modulos" ON iavolution.modules FOR SELECT USING (true);
CREATE POLICY "Todo el mundo lee lecciones" ON iavolution.lessons FOR SELECT USING (true);
CREATE POLICY "Todo el mundo lee materiales" ON iavolution.materials FOR SELECT USING (true);

-- Políticas para Lesson Progress
ALTER TABLE iavolution.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can mark their own progress" ON iavolution.lesson_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all progress" ON iavolution.lesson_progress FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM iavolution.roles r 
        JOIN iavolution.profiles p ON p.role_id = r.id
        WHERE p.id = auth.uid() AND (r.name = 'admin' OR r.name = 'manager')
    )
);

-- Políticas para Evaluaciones
ALTER TABLE iavolution.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE iavolution.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE iavolution.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE iavolution.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE iavolution.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Lectura para todos los alumnos del curso
CREATE POLICY "Lectura de evaluaciones para alumnos" ON iavolution.assignments FOR SELECT USING (true);
CREATE POLICY "Lectura de cuestionarios para alumnos" ON iavolution.quizzes FOR SELECT USING (true);
CREATE POLICY "Lectura de preguntas para alumnos" ON iavolution.quiz_questions FOR SELECT USING (true);

-- Entregas y Resultados (Privados por alumno)
CREATE POLICY "Alumnos gestionan sus entregas" ON iavolution.submissions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Alumnos ven sus resultados" ON iavolution.quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Alumnos crean sus intentos" ON iavolution.quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Gestión para Profesores/Admins
CREATE POLICY "Profesores gestionan evaluaciones" ON iavolution.assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM iavolution.profiles p JOIN iavolution.roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('admin', 'manager', 'teacher'))
);
CREATE POLICY "Profesores gestionan entregas" ON iavolution.submissions FOR ALL USING (
  EXISTS (SELECT 1 FROM iavolution.profiles p JOIN iavolution.roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('admin', 'manager', 'teacher'))
);
CREATE POLICY "Profesores gestionan cuestionarios" ON iavolution.quizzes FOR ALL USING (
  EXISTS (SELECT 1 FROM iavolution.profiles p JOIN iavolution.roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('admin', 'manager', 'teacher'))
);
CREATE POLICY "Profesores gestionan preguntas" ON iavolution.quiz_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM iavolution.profiles p JOIN iavolution.roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('admin', 'manager', 'teacher'))
);

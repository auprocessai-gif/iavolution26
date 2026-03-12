-- =========================================================
-- Script para crear las tablas de evaluaciones si no existen
-- Ejecutar este script en el SQL Editor de Supabase/pgAdmin
-- =========================================================

-- 1. Tabla de Asignaciones/Tareas
CREATE TABLE IF NOT EXISTS iavolution.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES iavolution.lessons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    instructions TEXT,
    max_points INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Entregas de Tareas
CREATE TABLE IF NOT EXISTS iavolution.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES iavolution.assignments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES iavolution.profiles(id) ON DELETE CASCADE,
    content TEXT,
    file_url TEXT,
    grade INTEGER,
    feedback TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Cuestionarios
CREATE TABLE IF NOT EXISTS iavolution.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES iavolution.lessons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    passing_score INTEGER DEFAULT 70,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de Preguntas de Cuestionario
CREATE TABLE IF NOT EXISTS iavolution.quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES iavolution.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0
);

-- 5. Tabla de Intentos de Cuestionario
CREATE TABLE IF NOT EXISTS iavolution.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES iavolution.quizzes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES iavolution.profiles(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================================
-- Permisos de acceso para los roles de Supabase
-- =========================================================
GRANT ALL ON iavolution.assignments TO authenticated;
GRANT ALL ON iavolution.submissions TO authenticated;
GRANT ALL ON iavolution.quizzes TO authenticated;
GRANT ALL ON iavolution.quiz_questions TO authenticated;
GRANT ALL ON iavolution.quiz_attempts TO authenticated;

GRANT ALL ON iavolution.assignments TO anon;
GRANT ALL ON iavolution.submissions TO anon;
GRANT ALL ON iavolution.quizzes TO anon;
GRANT ALL ON iavolution.quiz_questions TO anon;
GRANT ALL ON iavolution.quiz_attempts TO anon;

GRANT ALL ON iavolution.assignments TO service_role;
GRANT ALL ON iavolution.submissions TO service_role;
GRANT ALL ON iavolution.quizzes TO service_role;
GRANT ALL ON iavolution.quiz_questions TO service_role;
GRANT ALL ON iavolution.quiz_attempts TO service_role;

-- =========================================================
-- Habilitar RLS (Row Level Security)
-- =========================================================
ALTER TABLE iavolution.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE iavolution.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE iavolution.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE iavolution.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE iavolution.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- Políticas de seguridad
-- =========================================================

-- Lectura pública de evaluaciones
DO $$ BEGIN
CREATE POLICY "Lectura de evaluaciones para alumnos" ON iavolution.assignments FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "Lectura de cuestionarios para alumnos" ON iavolution.quizzes FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "Lectura de preguntas para alumnos" ON iavolution.quiz_questions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Gestión para Profesores/Admins
DO $$ BEGIN
CREATE POLICY "Profesores gestionan evaluaciones" ON iavolution.assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM iavolution.profiles p JOIN iavolution.roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('admin', 'manager', 'teacher'))
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "Profesores gestionan cuestionarios" ON iavolution.quizzes FOR ALL USING (
  EXISTS (SELECT 1 FROM iavolution.profiles p JOIN iavolution.roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('admin', 'manager', 'teacher'))
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "Profesores gestionan preguntas" ON iavolution.quiz_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM iavolution.profiles p JOIN iavolution.roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('admin', 'manager', 'teacher'))
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Entregas y Resultados (Privados por alumno)
DO $$ BEGIN
CREATE POLICY "Alumnos gestionan sus entregas" ON iavolution.submissions FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "Profesores gestionan entregas" ON iavolution.submissions FOR ALL USING (
  EXISTS (SELECT 1 FROM iavolution.profiles p JOIN iavolution.roles r ON p.role_id = r.id WHERE p.id = auth.uid() AND r.name IN ('admin', 'manager', 'teacher'))
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "Alumnos ven sus resultados" ON iavolution.quiz_attempts FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "Alumnos crean sus intentos" ON iavolution.quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =========================================================
-- RECARGAR SCHEMA CACHE DE POSTGREST
-- =========================================================
NOTIFY pgrst, 'reload schema';

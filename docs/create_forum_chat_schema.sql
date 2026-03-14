-- ==============================================================================
-- MIGRACIÓN: FOROS Y CHAT POR CURSO
-- ==============================================================================

-- 1. Tabla de Temas del Foro (Forum Topics)
CREATE TABLE IF NOT EXISTS iavolution.forum_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES iavolution.courses(id) ON DELETE CASCADE,
    author_id UUID REFERENCES iavolution.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Mensajes del Foro (Forum Posts/Replies)
CREATE TABLE IF NOT EXISTS iavolution.forum_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES iavolution.forum_topics(id) ON DELETE CASCADE,
    author_id UUID REFERENCES iavolution.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Chat en Tiempo Real (Course Chat)
CREATE TABLE IF NOT EXISTS iavolution.course_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES iavolution.courses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES iavolution.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en todas
ALTER TABLE iavolution.forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE iavolution.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE iavolution.course_messages ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE RLS

-- Forum Topics: Solo matriculados o Staff
DROP POLICY IF EXISTS "View topics if enrolled or staff" ON iavolution.forum_topics;
CREATE POLICY "View topics if enrolled or staff" ON iavolution.forum_topics
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM iavolution.enrollments e 
        WHERE e.course_id = iavolution.forum_topics.course_id AND e.user_id = auth.uid()
    ) OR iavolution.is_staff());

DROP POLICY IF EXISTS "Create topics if enrolled" ON iavolution.forum_topics;
DROP POLICY IF EXISTS "Create topics if staff" ON iavolution.forum_topics;
CREATE POLICY "Create topics if staff" ON iavolution.forum_topics
    FOR INSERT TO authenticated
    WITH CHECK (iavolution.is_staff());

-- Forum Posts: Similar a Topics
DROP POLICY IF EXISTS "View posts if topic is accessible" ON iavolution.forum_posts;
CREATE POLICY "View posts if topic is accessible" ON iavolution.forum_posts
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM iavolution.forum_topics t
        WHERE t.id = iavolution.forum_posts.topic_id
        AND (EXISTS (
            SELECT 1 FROM iavolution.enrollments e 
            WHERE e.course_id = t.course_id AND e.user_id = auth.uid()
        ) OR iavolution.is_staff())
    ));

DROP POLICY IF EXISTS "Create posts if enrolled" ON iavolution.forum_posts;
CREATE POLICY "Create posts if enrolled" ON iavolution.forum_posts
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM iavolution.forum_topics t
        WHERE t.id = iavolution.forum_posts.topic_id
        AND (EXISTS (
            SELECT 1 FROM iavolution.enrollments e 
            WHERE e.course_id = t.course_id AND e.user_id = auth.uid()
        ) OR iavolution.is_staff())
    ));

-- Course Messages: Real-time Chat
DROP POLICY IF EXISTS "View messages if enrolled or staff" ON iavolution.course_messages;
CREATE POLICY "View messages if enrolled or staff" ON iavolution.course_messages
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM iavolution.enrollments e 
        WHERE e.course_id = iavolution.course_messages.course_id AND e.user_id = auth.uid()
    ) OR iavolution.is_staff());

DROP POLICY IF EXISTS "Send messages if enrolled" ON iavolution.course_messages;
CREATE POLICY "Send messages if enrolled" ON iavolution.course_messages
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM iavolution.enrollments e 
        WHERE e.course_id = iavolution.course_messages.course_id AND e.user_id = auth.uid()
    ) OR iavolution.is_staff());

-- 5. HABILITAR REALTIME PARA EL CHAT
-- Usamos un bloque DO para evitar errores si la tabla ya está en la publicación
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'iavolution' 
        AND tablename = 'course_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE iavolution.course_messages;
    END IF;
END $$;

-- Grants
GRANT SELECT, INSERT ON iavolution.forum_topics TO authenticated;
GRANT SELECT, INSERT ON iavolution.forum_posts TO authenticated;
GRANT SELECT, INSERT ON iavolution.course_messages TO authenticated;

NOTIFY pgrst, 'reload schema';

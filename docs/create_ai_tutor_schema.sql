-- ==============================================================================
-- AI TUTOR: Esquema para el Tutor IA por curso
-- ==============================================================================

-- Tabla de conversaciones del tutor IA
CREATE TABLE IF NOT EXISTS iavolution.ai_tutor_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES iavolution.courses(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'Nueva conversación',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de mensajes del tutor IA
CREATE TABLE IF NOT EXISTS iavolution.ai_tutor_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES iavolution.ai_tutor_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Configuración del tutor IA por curso (opcional, para profesores)
CREATE TABLE IF NOT EXISTS iavolution.ai_tutor_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL UNIQUE REFERENCES iavolution.courses(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT true,
    system_prompt TEXT DEFAULT 'Eres un tutor experto y amable que ayuda a los alumnos a resolver dudas sobre el contenido del curso. Responde siempre en español. Sé conciso pero completo. Si no estás seguro de algo, dilo honestamente.',
    model TEXT DEFAULT 'gemini-2.0-flash',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ai_tutor_conversations_user_course ON iavolution.ai_tutor_conversations(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_messages_conversation ON iavolution.ai_tutor_messages(conversation_id);

-- Habilitar RLS
ALTER TABLE iavolution.ai_tutor_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE iavolution.ai_tutor_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE iavolution.ai_tutor_config ENABLE ROW LEVEL SECURITY;

-- Permisos de tabla
GRANT ALL ON iavolution.ai_tutor_conversations TO authenticated;
GRANT ALL ON iavolution.ai_tutor_messages TO authenticated;
GRANT ALL ON iavolution.ai_tutor_config TO authenticated;

-- === RLS: ai_tutor_conversations ===
DROP POLICY IF EXISTS "Users see own conversations" ON iavolution.ai_tutor_conversations;
CREATE POLICY "Users see own conversations" ON iavolution.ai_tutor_conversations
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR iavolution.is_staff());

DROP POLICY IF EXISTS "Users create own conversations" ON iavolution.ai_tutor_conversations;
CREATE POLICY "Users create own conversations" ON iavolution.ai_tutor_conversations
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own conversations" ON iavolution.ai_tutor_conversations;
CREATE POLICY "Users delete own conversations" ON iavolution.ai_tutor_conversations
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- === RLS: ai_tutor_messages ===
DROP POLICY IF EXISTS "Users see own messages" ON iavolution.ai_tutor_messages;
CREATE POLICY "Users see own messages" ON iavolution.ai_tutor_messages
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM iavolution.ai_tutor_conversations c
            WHERE c.id = ai_tutor_messages.conversation_id AND (c.user_id = auth.uid() OR iavolution.is_staff())
        )
    );

DROP POLICY IF EXISTS "Users create messages in own conversations" ON iavolution.ai_tutor_messages;
CREATE POLICY "Users create messages in own conversations" ON iavolution.ai_tutor_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM iavolution.ai_tutor_conversations c
            WHERE c.id = ai_tutor_messages.conversation_id AND c.user_id = auth.uid()
        )
    );

-- === RLS: ai_tutor_config ===
DROP POLICY IF EXISTS "Anyone enrolled can read config" ON iavolution.ai_tutor_config;
CREATE POLICY "Anyone enrolled can read config" ON iavolution.ai_tutor_config
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM iavolution.enrollments e
            WHERE e.course_id = ai_tutor_config.course_id AND e.user_id = auth.uid()
        ) OR iavolution.is_staff()
    );

DROP POLICY IF EXISTS "Staff can manage config" ON iavolution.ai_tutor_config;
CREATE POLICY "Staff can manage config" ON iavolution.ai_tutor_config
    FOR ALL TO authenticated
    USING (iavolution.is_staff())
    WITH CHECK (iavolution.is_staff());

NOTIFY pgrst, 'reload schema';

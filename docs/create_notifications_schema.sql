-- Protocolo de Notificaciones para IAVolution
-- ==========================================

-- 1. Tabla de Notificaciones
CREATE TABLE IF NOT EXISTS iavolution.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES iavolution.profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'grade', 'event', 'enrollment', 'system', 'announcement'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link TEXT, -- Opcional, para redirigir al clickear
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE iavolution.notifications ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de RLS
-- Los usuarios solo pueden ver sus propias notificaciones
CREATE POLICY "Users can view own notifications"
    ON iavolution.notifications FOR SELECT
    USING (auth.uid() = user_id);

-- Los usuarios pueden marcar sus propias notificaciones como leídas (UPDATE)
CREATE POLICY "Users can update own notifications"
    ON iavolution.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Los admins y el sistema pueden insertar notificaciones para cualquier usuario
CREATE POLICY "System/Admins can insert notifications"
    ON iavolution.notifications FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM iavolution.profiles p
            JOIN iavolution.roles r ON p.role_id = r.id
            WHERE p.id = auth.uid() AND r.name IN ('admin', 'manager', 'teacher')
        )
        OR auth.uid() IS NOT NULL -- Permitir inserciones desde lógica de servidor/triggers si aplica
    );

-- 4. Permisos
GRANT ALL ON iavolution.notifications TO authenticated;
GRANT ALL ON iavolution.notifications TO service_role;

-- 5. Recargar caché
NOTIFY pgrst, 'reload schema';

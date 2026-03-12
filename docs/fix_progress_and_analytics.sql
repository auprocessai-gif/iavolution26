-- ==============================================================================
-- MIGRACIÓN: PROGRESO AUTOMÁTICO + FIX ANALÍTICA
-- Ejecutar en el SQL Editor de Supabase
-- ==============================================================================

-- 1. Tabla para registrar materiales vistos por cada alumno
CREATE TABLE IF NOT EXISTS iavolution.material_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES iavolution.materials(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, material_id)
);

ALTER TABLE iavolution.material_views ENABLE ROW LEVEL SECURITY;

-- Cada usuario gestiona sus propios registros de vistas
DROP POLICY IF EXISTS "Users manage own material views" ON iavolution.material_views;
CREATE POLICY "Users manage own material views"
    ON iavolution.material_views FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Staff puede ver todas las vistas (para analítica)
DROP POLICY IF EXISTS "Staff can view all material views" ON iavolution.material_views;
CREATE POLICY "Staff can view all material views"
    ON iavolution.material_views FOR SELECT
    USING (iavolution.is_admin() OR iavolution.is_manager() OR iavolution.is_teacher());

GRANT ALL ON iavolution.material_views TO authenticated;

-- 2. Fix RLS en user_sessions (eliminar recursión)
DROP POLICY IF EXISTS "Admins and Teachers can view all sessions" ON iavolution.user_sessions;
CREATE POLICY "Staff can view all sessions"
    ON iavolution.user_sessions FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR iavolution.is_admin()
        OR iavolution.is_manager()
        OR iavolution.is_teacher()
    );

-- 3. Crear wrapper en public schema para que el RPC funcione sin prefijo
CREATE OR REPLACE FUNCTION public.increment_minutes(row_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE iavolution.user_sessions
    SET total_minutes = total_minutes + 1,
        last_ping = now()
    WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Forzar refresco de caché
NOTIFY pgrst, 'reload schema';
